# Backend - Marketing CRM

Express.js API server with MVC architecture.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Structure

```
src/
  config/       - Configuration files (Supabase, env)
  controllers/  - Request handlers
  middleware/   - Express middleware
  models/       - Data models
  routes/       - Route definitions
  services/     - Business logic
  repositories/ - Data access layer
  validations/  - Request validation
  helpers/      - Helper functions
  utils/        - Utility functions
  constants/    - Constants
  sockets/      - WebSocket handlers
  cron/         - Scheduled jobs
  uploads/      - File uploads
  logs/         - Log files
  app.js        - Express app
  server.js     - Server entry
```
