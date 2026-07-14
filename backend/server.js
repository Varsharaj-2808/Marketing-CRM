const path = require('path');
const fs = require('fs');
const localEnv = path.join(__dirname, '.env');
const parentEnv = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: fs.existsSync(localEnv) ? localEnv : parentEnv });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const marketingRoutes = require('./src/routes/marketing');
const searchRoutes = require('./src/routes/search');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((err, req, res, next) => {
  if (
    err.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400))
  ) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/search', searchRoutes);

const { protect } = require('./src/middleware/auth');
const notificationController = require('./src/controllers/notificationController');
app.get('/api/notifications', protect, notificationController.getNotifications);
app.get('/api/notifications/count', protect, notificationController.getNotificationCount);
app.put('/api/notifications/:id/read', protect, notificationController.markAsRead);
app.put('/api/notifications/read-all', protect, notificationController.markAllAsRead);

app.use(errorHandler);

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Server kept alive:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Server kept alive:', reason);
});

app.listen(PORT, (err) => {
  if (err) {
    console.error(`Error starting server on port ${PORT}:`, err);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});
