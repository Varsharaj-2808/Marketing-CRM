const jwt = require('jsonwebtoken');
const User = require('../models/User');

const wrapAuthError = (statusCode, message, error) => ({
  status: 'error',
  status_code: statusCode,
  message,
  body: { error },
});

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json(wrapAuthError(401, 'Authentication required', 'Please provide a valid authentication token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json(wrapAuthError(401, 'Authentication required', 'User not found'));
    }

    const accountStatus = user.accountStatus || user.status;
    if (accountStatus !== 'active') {
      return res.status(403).json(wrapAuthError(403, 'Account is inactive', 'Account is inactive. Contact administrator.'));
    }

    // Normalize legacy role values
    if (user.role === 'admin' || user.role === 'super_admin') user.role = 'Admin';
    else if (user.role === 'user' || user.role === 'manager') user.role = 'Marketing Executive';

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(wrapAuthError(401, 'Authentication required', 'Token expired'));
    }
    return res.status(401).json(wrapAuthError(401, 'Authentication required', 'Invalid token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(wrapAuthError(401, 'Authentication required', 'Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      const roleList = roles.join(', ');
      return res.status(403).json(wrapAuthError(403, 'Access denied', `Required role(s): ${roleList}`));
    }
    next();
  };
};

module.exports = { protect, authorize };
