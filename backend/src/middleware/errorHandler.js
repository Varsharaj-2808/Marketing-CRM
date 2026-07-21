const errorHandler = (err, req, res, next) => {
  if (
    err.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400))
  ) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  console.error(`[Error] ${err.message}`);
  if (err.stack) console.error(err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  if (err.code === '23505') {
    const detail = err.detail || '';
    if (detail.includes('email')) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    if (detail.includes('mobile')) {
      return res.status(409).json({ success: false, message: 'Mobile number already registered.' });
    }
    return res.status(409).json({ success: false, message: 'Duplicate value. This record already exists.' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  const isDbError = err.code && (
    err.code.startsWith('ECONN') ||
    err.code === '57P01' ||
    err.code === '57P02' ||
    err.code === '57P03' ||
    err.code === '08006' ||
    err.code === '08001' ||
    err.code === '08003' ||
    err.code === '08004' ||
    err.code === '08P01' ||
    err.message?.includes('connection') ||
    err.message?.includes('terminated') ||
    err.message?.includes('timeout') ||
    err.message?.includes('ECONNREFUSED') ||
    err.message?.includes('ENOTFOUND')
  );

  if (res.headersSent) return next(err);

  const status = isDbError ? 503 : (err.statusCode || 500);
  const message = isDbError
    ? 'Service temporarily unavailable. Please try again.'
    : (err.message || 'Internal server error');

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
