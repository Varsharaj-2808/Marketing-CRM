const errorHandler = (err, req, res, next) => {
  // ΓöÇΓöÇ body-parser malformed JSON ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (
    err.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400))
  ) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  console.error(`Error: ${err.message}`);
  console.error(err.stack);

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

  // ΓöÇΓöÇ Ensure response is always sent (never let an error go unhandled) ΓöÇΓöÇ
  if (res.headersSent) return next(err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
