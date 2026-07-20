const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const marketingRoutes = require('./routes/marketing');
const searchRoutes = require('./routes/search');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const path = require('path');
app.use('/exports', express.static(path.join(__dirname, '..', 'exports')));

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

const { protect } = require('./middleware/auth');
const notificationController = require('./controllers/notificationController');
app.get('/api/notifications', protect, notificationController.getNotifications);
app.get('/api/notifications/count', protect, notificationController.getNotificationCount);
app.put('/api/notifications/:id/read', protect, notificationController.markAsRead);
app.put('/api/notifications/read-all', protect, notificationController.markAllAsRead);

app.use(errorHandler);

module.exports = app;
