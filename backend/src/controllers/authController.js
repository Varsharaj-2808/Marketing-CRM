const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { withTransaction } = require('../utils/transactionHelper');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

const getLockoutConfig = async () => {
  try {
    return await SystemSetting.getLockoutConfig();
  } catch {
    return {
      lockoutThreshold: parseInt(process.env.LOCKOUT_THRESHOLD || '5'),
      lockoutWindowMinutes: parseInt(process.env.LOCKOUT_WINDOW_MINUTES || '15'),
      resetTokenExpiryMinutes: parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || '30'),
    };
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
    const { email, password, remember_me, rememberMe } = req.body;
    const effectiveRememberMe = remember_me || rememberMe;
    const { ipAddress, userAgent } = getIpAndAgent(req);
    const config = await getLockoutConfig();
    const lockoutThreshold = config.lockoutThreshold;
    const lockoutWindowMs = config.lockoutWindowMinutes * 60 * 1000;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    if (typeof email !== 'string' || email.length > 255) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      await AuditLog.create({ action: 'user.login_failed', details: `Invalid login attempt for email: ${email}`, ipAddress, userAgent, result: 'failure' });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accountStatus = user.accountStatus || user.status;
    if (accountStatus === 'inactive') {
      await AuditLog.create({ userId: user.id, action: 'user.login_failed', details: 'Account is inactive', ipAddress, userAgent, result: 'failure' });
      return res.status(403).json({ success: false, message: 'Account is inactive. Contact administrator.' });
    }

    if (accountStatus === 'locked' && user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const retryAfter = Math.ceil((new Date(user.lockoutUntil) - new Date()) / 1000);
      await AuditLog.create({ userId: user.id, action: 'user.login_failed', details: `Account locked. Retry after ${retryAfter}s`, ipAddress, userAgent, result: 'failure' });
      return res.status(423).json({
        success: false,
        message: `Account locked. Too many failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        data: { locked_until: user.lockoutUntil },
      });
    }

    const isMatch = await User.comparePassword(password, user.password);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= lockoutThreshold) {
        const lockoutUntil = new Date(Date.now() + lockoutWindowMs);
        await withTransaction(async (client) => {
          await User.lockAccount(user.id, lockoutUntil, user.failedLoginAttempts, client);
          await AuditLog.create({ userId: user.id, action: 'user.login_failed', details: `Account locked after ${user.failedLoginAttempts} failed attempts`, ipAddress, userAgent, result: 'failure' }, client);
        });
        return res.status(423).json({
          success: false,
          message: `Account locked. Too many failed attempts. Try again in ${config.lockoutWindowMinutes} minutes.`,
          data: { locked_until: lockoutUntil },
        });
      }

      await withTransaction(async (client) => {
        await User.incrementFailedAttempts(user.id, client);
        await AuditLog.create({ userId: user.id, action: 'user.login_failed', details: `Invalid password (attempt ${user.failedLoginAttempts})`, ipAddress, userAgent, result: 'failure' }, client);
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isFirstLogin = !user.lastLoginAt;

    // Normalize legacy role values before generating JWT
    if (user.role === 'admin' || user.role === 'super_admin') user.role = 'Admin';
    else if (user.role === 'user' || user.role === 'manager') user.role = 'Marketing Executive';

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, effectiveRememberMe);
    const hashedRefresh = await bcrypt.hash(refreshToken, 12);

    await withTransaction(async (client) => {
      await User.unlockAccount(user.id, client);
      await User.setLastLogin(user.id, client);
      await User.storeRefreshToken(user.id, hashedRefresh, client);
      await AuditLog.create({
        userId: user.id, email: user.email, action: 'user.login', resource: 'user',
        details: 'Successful login', ipAddress, userAgent, result: 'success',
      }, client);
    });

    const safeUser = User.toResponseUser(user);
    delete safeUser.mobile;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: accessToken,
        refreshToken,
        expiresIn: 3600,
        user: safeUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

const SESSION_INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const elapsed = Date.now() - decoded.iat * 1000;
    if (elapsed > SESSION_INACTIVITY_LIMIT_MS) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (user.refreshToken && !(await bcrypt.compare(refreshToken, user.refreshToken))) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Normalize legacy role values before generating JWT (same as login)
    if (user.role === 'admin' || user.role === 'super_admin') user.role = 'Admin';
    else if (user.role === 'user' || user.role === 'manager') user.role = 'Marketing Executive';

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await User.storeRefreshToken(user.id, await bcrypt.hash(newRefreshToken, 12));

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        expiresIn: 3600,
        token: newAccessToken,
      },
    });
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
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { ipAddress, userAgent } = getIpAndAgent(req);

    await withTransaction(async (client) => {
      await User.clearRefreshToken(req.user.id, client);
      await AuditLog.create({
        userId: req.user.id, email: req.user.email, action: 'user.logout', resource: 'user',
        details: 'User logged out', ipAddress, userAgent, result: 'success',
      }, client);
    });

    res.json({ success: true, message: 'Logout successful', data: null });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email: rawEmail } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!rawEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const email = rawEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const config = await getLockoutConfig();
    const resetTokenExpiryMs = config.resetTokenExpiryMinutes * 60 * 1000;

    const user = await User.findByEmail(email.toLowerCase());

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 12);
      const expiry = new Date(Date.now() + resetTokenExpiryMs);

      await withTransaction(async (client) => {
        await User.storeResetToken(user.id, hashedToken, expiry, client);
        await AuditLog.create({
          userId: user.id, email: user.email, action: 'user.forgot_password', resource: 'user',
          details: 'Password reset token generated and emailed', ipAddress, userAgent, result: 'success',
        }, client);
      });

      const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/app/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(email, resetUrl);
    } else {
      await AuditLog.create({
        email, action: 'user.forgot_password', resource: 'user',
        details: `Password reset requested for non-existent email: ${email}`, ipAddress, userAgent, result: 'failure',
      });
    }

    res.json({ success: true, message: 'Password reset link sent to email', data: null });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
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
      await withTransaction(async (client) => {
        await User.clearResetToken(targetUser.id, client);
        await AuditLog.create({
          userId: targetUser.id, email: targetUser.email, action: 'user.reset_password',
          details: 'Reset token expired', ipAddress, userAgent, result: 'failure',
        }, client);
      });
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    const isSameAsOld = await User.comparePassword(newPassword, targetUser.password);
    if (isSameAsOld) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    await withTransaction(async (client) => {
      await User.update(targetUser.id, { password: newPassword }, client);
      await User.clearAllTokens(targetUser.id, client);
      await AuditLog.create({
        userId: targetUser.id, email: targetUser.email, action: 'user.reset_password', resource: 'user',
        details: 'Password reset successfully', ipAddress, userAgent, result: 'success',
      }, client);
    });

    res.json({ success: true, message: 'Password has been reset successfully', data: null });
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
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await User.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      await AuditLog.create({
        userId: user.id, email: user.email, action: 'user.change_password',
        details: 'Current password is incorrect', ipAddress, userAgent, result: 'failure',
      });
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const isSameAsCurrent = await User.comparePassword(newPassword, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    await withTransaction(async (client) => {
      await User.update(user.id, { password: newPassword }, client);
      await User.clearRefreshToken(user.id, client);
      await AuditLog.create({
        userId: user.id, email: user.email, action: 'user.change_password', resource: 'user',
        details: 'Password changed successfully', ipAddress, userAgent, result: 'success',
      }, client);
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};
