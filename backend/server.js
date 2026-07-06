require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { testConnection } = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const { testConnection: testAlgolia } = require('./src/utils/algoliaService');
const SystemSetting = require('./src/models/SystemSetting');

const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const marketingRoutes = require('./src/routes/marketing');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Catch malformed JSON bodies (body-parser SyntaxError) ────
// body-parser sets err.type = 'entity.parse.failed' on bad JSON.
// This MUST be here (before routes) to intercept the error early.
app.use((err, req, res, next) => {
  if (
    err.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400))
  ) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

app.use('/exports', express.static(path.join(__dirname, 'exports'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.xlsx')) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    } else if (filePath.endsWith('.csv')) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
  },
}));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/marketing', marketingRoutes);

app.use(errorHandler);

// ── Process-level safety nets ─────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Server kept alive:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Server kept alive:', reason);
});

testConnection().then((dbConnected) => {
  if (!dbConnected) {
    console.error('Failed to connect to database. Server not started.');
    process.exit(1);
  }

  testAlgolia();

  SystemSetting.getLockoutConfig().then(() => {
    console.log('System settings initialized.');
  }).catch(err => {
    console.warn('System settings not available yet:', err.message);
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
