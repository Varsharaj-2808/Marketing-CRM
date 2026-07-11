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
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const result = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Normalize role from JWT (handles legacy casing)
    if (decoded.role) user.role = decoded.role;

    req.user = user;
    next();
  } catch (error) {
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
