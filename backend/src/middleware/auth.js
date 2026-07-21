const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided', body: { error: 'Authentication required' } });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const isAuthUrl = req.originalUrl && req.originalUrl.includes('auth');
      const msg = isAuthUrl ? 'Invalid or expired token.' : 'Invalid or expired token';
      return res.status(401).json({ success: false, message: msg });
    }

    let result;
    try {
      result = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    } catch (dbErr) {
      console.error('[protect] DB error looking up user:', dbErr.message);
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again.' });
    }

    const user = result.rows[0];
    if (!user) {
      const isAuthUrl = req.originalUrl && req.originalUrl.includes('auth');
      const msg = isAuthUrl ? 'Invalid or expired token.' : 'Invalid or expired token';
      return res.status(401).json({ success: false, message: msg });
    }

    // Normalize role (handles legacy casing)
    const roleToNormalize = user.role || decoded.role;
    if (roleToNormalize) {
      let normalizedRole = roleToNormalize;
      if (roleToNormalize === 'admin' || roleToNormalize === 'super_admin') {
        normalizedRole = 'Admin';
      } else if (roleToNormalize === 'user' || roleToNormalize === 'manager') {
        normalizedRole = 'Marketing Executive';
      }
      user.role = normalizedRole;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[protect] Unexpected error:', error.message);
    next(error);
  }
};

/**
 * authorize(...roles)
 * Accepts an optional options object as the last argument:
 *   authorize('Admin', { message: 'Custom 403 message' })
 */
const authorize = (...args) => {
  // Extract optional options object from last argument
  let options = {};
  let roles = args;
  if (args.length > 0 && typeof args[args.length - 1] === 'object' && !Array.isArray(args[args.length - 1])) {
    options = args[args.length - 1];
    roles = args.slice(0, -1);
  }

  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      // Determine message
      let message = options.message;
      let bodyError = options.bodyError;
      if (!message) {
        if (roles.length === 1 && roles[0] === 'Admin') {
          message = 'Access denied. Admin role required.';
        } else if (roles.length === 1 && roles[0] === 'Marketing Executive') {
          message = 'This endpoint is restricted to Marketing Executive role';
        } else {
          message = 'Access denied.';
        }
      }
      const body = bodyError ? { error: bodyError } : undefined;
      return res.status(403).json({ success: false, status_code: 403, message, body });
    }
    next();
  };
};

module.exports = { protect, authorize };
