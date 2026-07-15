const path = require('path');
const fs = require('fs');
const localEnv = path.join(__dirname, '..', '.env');
const parentEnv = path.join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: fs.existsSync(localEnv) ? localEnv : parentEnv });

const app = require('./app');

const PORT = process.env.PORT || 5000;

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
