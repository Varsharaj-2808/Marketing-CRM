const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protectStageManagement = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization) {
      if (req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        if (!token) {
          return res.status(401).json({ error: 'Authentication required' });
        }
      } else {
        return res.status(401).json({ error: 'Invalid token format' });
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired' });
      }
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accountStatus = user.accountStatus || user.status;
    if (accountStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is inactive. Contact administrator.' });
    }

    // Normalize legacy role values
    if (user.role === 'admin' || user.role === 'super_admin') user.role = 'Admin';
    else if (user.role === 'user' || user.role === 'manager') user.role = 'Marketing Executive';

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const authorizeStageManagement = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      if (roles.includes('Admin') && roles.length === 1) {
        return res.status(403).json({ error: 'Forbidden. Admin access required.' });
      }
      return res.status(403).json({ error: 'Forbidden. Access denied.' });
    }
    next();
  };
};

module.exports = { protectStageManagement, authorizeStageManagement };
