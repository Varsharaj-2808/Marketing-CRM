const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendPasswordResetEmail } = require('../utils/emailService');

const LOCKOUT_THRESHOLD = parseInt(process.env.LOCKOUT_THRESHOLD || '5');
const LOCKOUT_WINDOW_MS = parseInt(process.env.LOCKOUT_WINDOW_MINUTES || '15') * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || '30') * 60 * 1000;

const logAudit = async (data) => {
  try {
    await AuditLog.create(data);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

const generateRefreshToken = (user, rememberMe = false) => {
  const expiresIn = rememberMe
    ? process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER || '30d'
    : process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, remember_me } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      await logAudit({ action: 'LOGIN_FAILED', details: `Invalid login attempt for email: ${email}`, ipAddress, userAgent, result: 'Failed' });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.accountStatus === 'inactive') {
      await logAudit({ userId: user.id, action: 'LOGIN_REJECTED_INACTIVE', details: 'Account is inactive', ipAddress, userAgent, result: 'Failed' });
      return res.status(403).json({ success: false, message: 'Account is inactive. Contact administrator.' });
    }

    if (user.accountStatus === 'locked' && user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const retryAfter = Math.ceil((new Date(user.lockoutUntil) - new Date()) / 1000);
      await logAudit({ userId: user.id, action: 'LOGIN_REJECTED_LOCKED', details: `Account locked. Retry after ${retryAfter}s`, ipAddress, userAgent, result: 'Failed' });
      return res.status(423).json({
        success: false,
        message: `Account locked. Too many failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        locked_until: user.lockoutUntil,
      });
    }

    const isMatch = await User.comparePassword(password, user.password);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= LOCKOUT_THRESHOLD) {
        const lockoutUntil = new Date(Date.now() + LOCKOUT_WINDOW_MS);
        await User.lockAccount(user.id, lockoutUntil);
        await logAudit({ userId: user.id, action: 'ACCOUNT_LOCKED', details: `Account locked after ${user.failedLoginAttempts} failed attempts`, ipAddress, userAgent, result: 'Failed' });
        return res.status(423).json({
          success: false,
          message: `Account locked. Too many failed attempts. Try again in ${process.env.LOCKOUT_WINDOW_MINUTES || 15} minutes.`,
          locked_until: lockoutUntil,
        });
      }

      await User.incrementFailedAttempts(user.id);
      await logAudit({ userId: user.id, action: 'LOGIN_FAILED', details: `Invalid password (attempt ${user.failedLoginAttempts})`, ipAddress, userAgent, result: 'Failed' });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await User.unlockAccount(user.id);
    await User.setLastLogin(user.id);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, remember_me);
    const hashedRefresh = await bcrypt.hash(refreshToken, 12);
    await User.storeRefreshToken(user.id, hashedRefresh);

    const redirect = user.role === 'super_admin' || user.role === 'admin' ? '/admin/dashboard' : '/marketing/leads';

    await logAudit({
      userId: user.id, email: user.email, action: 'LOGIN_SUCCESS', resource: 'Auth',
      details: 'Successful login', ipAddress, userAgent, result: 'Success',
    });

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      token_expires_in: remember_me ? '30d' : '7d',
      user: User.toResponseUser(user),
      redirect,
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (user.refreshToken && !(await bcrypt.compare(refreshToken, user.refreshToken))) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await User.storeRefreshToken(user.id, await bcrypt.hash(newRefreshToken, 12));

    res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: User.toSafeUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { ipAddress, userAgent } = getIpAndAgent(req);

    await User.clearRefreshToken(req.user.id);

    await logAudit({
      userId: req.user.id, email: req.user.email, action: 'LOGOUT', resource: 'Auth',
      details: 'User logged out', ipAddress, userAgent, result: 'Success',
    });

    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findByEmail(email.toLowerCase());

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 12);
      const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      await User.storeResetToken(user.id, hashedToken, expiry);

      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(email, resetUrl);

      await logAudit({
        userId: user.id, email: user.email, action: 'FORGOT_PASSWORD', resource: 'Auth',
        details: 'Password reset token generated and emailed', ipAddress, userAgent, result: 'Success',
      });
    } else {
      await logAudit({
        email, action: 'FORGOT_PASSWORD', resource: 'Auth',
        details: `Password reset requested for non-existent email: ${email}`, ipAddress, userAgent, result: 'Failed',
      });
    }

    res.json({ success: true, message: 'If email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const usersWithTokens = await User.findByResetToken();
    let targetUser = null;

    for (const u of usersWithTokens) {
      if (await bcrypt.compare(token, u.resetToken)) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    if (targetUser.resetTokenExpiry && new Date(targetUser.resetTokenExpiry) < new Date()) {
      await User.clearResetToken(targetUser.id);
      await logAudit({
        userId: targetUser.id, email: targetUser.email, action: 'RESET_PASSWORD',
        details: 'Reset token expired', ipAddress, userAgent, result: 'Failed',
      });
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    const isSameAsOld = await User.comparePassword(newPassword, targetUser.password);
    if (isSameAsOld) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    await User.update(targetUser.id, { password: newPassword });
    await User.clearAllTokens(targetUser.id);

    await logAudit({
      userId: targetUser.id, email: targetUser.email, action: 'RESET_PASSWORD', resource: 'Auth',
      details: 'Password reset successfully', ipAddress, userAgent, result: 'Success',
    });

    res.json({ success: true, message: 'Password reset done' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Min 8 chars required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await User.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      await logAudit({
        userId: user.id, email: user.email, action: 'CHANGE_PASSWORD',
        details: 'Current password is incorrect', ipAddress, userAgent, result: 'Failed',
      });
      return res.status(400).json({ success: false, message: 'Current password wrong' });
    }

    const isSameAsCurrent = await User.comparePassword(newPassword, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    await User.update(user.id, { password: newPassword });
    await User.clearRefreshToken(user.id);

    await logAudit({
      userId: user.id, email: user.email, action: 'CHANGE_PASSWORD', resource: 'Auth',
      details: 'Password changed successfully', ipAddress, userAgent, result: 'Success',
    });

    res.json({ success: true, message: 'Password changed' });
  } catch (error) {
    next(error);
  }
};
