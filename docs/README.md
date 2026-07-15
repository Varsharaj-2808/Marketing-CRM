# Marketing CRM — Backend API

Express.js REST API server for the Marketing CRM platform. Manages leads, follow-ups, user accounts, dashboards, audit logging, and Algolia-powered search backed by PostgreSQL (Supabase-compatible).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 18 |
| Framework | Express.js 5 |
| Database | PostgreSQL 14+ via `pg` (raw SQL, no ORM) |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Search | Algolia |
| Email | Nodemailer (SMTP) |
| Testing | Jest + Supertest |
| PDF Export | PDFKit |
| Spreadsheet Export | SheetJS (xlsx) |

## Features

- **Lead Management** — Full lifecycle from creation to closure (Won/Lost), stage pipeline, duplicate detection
- **Follow-up Tracking** — Call, meeting, email, demo logs with outcomes and immutability (append-only with corrections)
- **Role-Based Access** — Admin and Marketing Executive roles with JWT authentication and account lockout
- **Dashboard Analytics** — KPIs, category volume, conversion rates, at-risk leads, lead volume by source/category
- **Audit Logging** — System-wide audit trail with archival and retention settings
- **Field History** — Field-level change tracking per lead with CSV export
- **Notifications** — Real-time in-app notifications with email delivery for lead assignments and follow-ups
- **Algolia Search** — Global search across leads, follow-ups, notifications, and audit logs
- **Bulk Operations** — Bulk lead selection, assignment, and CSV/XLSX/PDF export
- **Category/Subcategory CRUD** — Hierarchical taxonomy with active/inactive status and in-use checks
- **Saved Views** — Admin filter presets for lead listing
- **SMTP Integration** — Password resets, lead notifications, daily reminder emails
- **Daily Reminders** — Automated email reminders for overdue and upcoming follow-ups

---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** >= 14 (local install or Supabase project)
- **psql** CLI (for database setup)
- **Git**

---

## Installation

```bash
git clone https://github.com/Varsharaj-2808/Marketing-CRM.git
cd Marketing-CRM/backend
npm install
```

---

## Environment Setup

```bash
cp .env.example .env
```

Open `.env` and fill in the required values.

### Required Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `PORT` | No | Server port (default: `5000`) |
| `NODE_ENV` | No | `development` or `production` (default: `development`) |

### Optional Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Supabase only | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase only | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase only | Supabase service role key |
| `JWT_EXPIRES_IN` | No | Access token expiry (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiry (default: `7d`) |
| `SMTP_HOST` | For email | SMTP server hostname |
| `SMTP_PORT` | For email | SMTP port (default: `465`) |
| `SMTP_USER` | For email | SMTP username / email |
| `SMTP_PASS` | For email | SMTP password / app password |
| `ALGOLIA_APP_ID` | For search | Algolia application ID |
| `ALGOLIA_API_KEY` | For search | Algolia admin API key |
| `CORS_ORIGIN` | No | Allowed CORS origin (default: `*`) |
| `LOCKOUT_THRESHOLD` | No | Max failed login attempts before lockout (default: `5`) |
| `LOCKOUT_WINDOW_MINUTES` | No | Lockout duration in minutes (default: `15`) |
| `RESET_TOKEN_EXPIRY_MINUTES` | No | Password reset token expiry in minutes (default: `30`) |

### Example `.env`

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/marketing_crm
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALGOLIA_APP_ID=your-app-id
ALGOLIA_API_KEY=your-admin-api-key
CORS_ORIGIN=*
LOCKOUT_THRESHOLD=5
LOCKOUT_WINDOW_MINUTES=15
RESET_TOKEN_EXPIRY_MINUTES=30
```

---

## Database Setup

This project uses **raw SQL** (no ORM, no migration framework). The full schema is in `database/schema/init.sql`.

### Create the database

**Local PostgreSQL:**

```bash
psql -U postgres -c "CREATE DATABASE marketing_crm;"
psql -U postgres -d marketing_crm -f database/schema/init.sql
```

**Using DATABASE_URL:**

```bash
psql "$DATABASE_URL" -f database/schema/init.sql
```

**Supabase:**

Paste the contents of `database/schema/init.sql` into the Supabase SQL Editor and run it.

### Reset the database

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS marketing_crm;"
psql -U postgres -c "CREATE DATABASE marketing_crm;"
psql -U postgres -d marketing_crm -f database/schema/init.sql
```

### Verify the migration

```bash
# List all tables
psql -U postgres -d marketing_crm -c "\dt"

# Check table row counts
psql -U postgres -d marketing_crm -c "
  SELECT tablename, n_live_tup AS row_estimate
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC;
"

# Verify seed data
psql -U postgres -d marketing_crm -c "SELECT * FROM system_settings;"
```

### Create the first admin user

```bash
node -e "
const { query } = require('./src/config/db');
const bcrypt = require('bcryptjs');
(async () => {
  const hash = await bcrypt.hash('Admin@123', 12);
  await query(
    \`INSERT INTO users (\"employee_id\", name, email, mobile, role, \"accountStatus\", password, \"firstName\", \"lastName\")
     VALUES ('EMP-00001', 'Admin', 'admin@example.com', '9999999999', 'Admin', 'active', \$1, 'Admin', 'User')
     ON CONFLICT (email) DO NOTHING\`,
    [hash]
  );
  console.log('Admin user created (admin@example.com / Admin@123)');
  process.exit(0);
})();
"
```

> **Note:** There are no Sequelize/TypeORM migration or seeder commands. The schema is managed via the single `init.sql` file, and seed data is inserted via the admin user script above and the `system_settings` defaults in `init.sql`.

---

## Running the Project

### Development

```bash
npm run dev
```

Starts the server with `--watch` for auto-reload on file changes. Runs on `http://localhost:5000`.

### Production

```bash
npm start
```

Starts the server with `node src/server.js` (no auto-reload).

### Health Check

```bash
curl http://localhost:5000/api/health
# {"success":true,"message":"CRM API is running","timestamp":"..."}
```

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `node --watch src/server.js` | Start development server with auto-reload |
| `npm start` | `node src/server.js` | Start production server |
| `npm test` | `jest --forceExit --detectOpenHandles` | Run Jest unit tests |
| `npm run lint` | `eslint src/` | Lint source files |

### Utility Scripts

Located in `scripts/`. Run with `node scripts/<filename>`.

| Script | Description |
|--------|-------------|
| `scripts/reset-pw.js` | Reset a user's password (edit email in file first) |
| `scripts/check_db_details.js` | Verify DB connection and inspect table schemas |
| `scripts/check_me_details.js` | Check Marketing Executive user details |
| `scripts/check_mismatches.js` | Detect data inconsistencies |
| `scripts/qa_checker.js` | QA data integrity checks |
| `scripts/verify_notifications.js` | Verify notification system |
| `scripts/test_admin_email_send.js` | Test admin email delivery |
| `scripts/test_admin_notifications.js` | Test admin notification flow |
| `scripts/test_admin_notifications_api.js` | Test admin notifications API endpoint |
| `scripts/e2e_final.js` | End-to-end SMTP + DB verification |
| `scripts/e2e_notification_tester.js` | End-to-end notification flow test |
| `scripts/trace_lead_creation.js` | Trace lead creation flow for debugging |
| `scripts/rca_trace.js` | Root cause analysis trace |
| `scripts/fix_tests.js` | Fix test data |
| `scripts/fix_tests2.js` | Fix test data (variant) |
| `scripts/update_tests.js` | Update test fixtures |

---

## API Documentation

### Base URL

```
http://localhost:5000
```

### Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Obtain tokens via `POST /api/auth/login`.

### Roles

| Role | Access |
|------|--------|
| `Admin` | Full access to all endpoints |
| `Marketing Executive` | Leads, follow-ups, dashboard, notifications (read categories/services/sources) |

### Endpoints

#### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | API health status |

#### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | No | Login (rate-limited: 20/min) |
| POST | `/logout` | Yes | Logout, invalidate refresh token |
| GET | `/profile` | Yes | Get current user profile |
| POST | `/refresh` | No | Refresh access token |
| POST | `/refresh-token` | No | Refresh access token (alias) |
| POST | `/forgot-password` | No | Request password reset email |
| POST | `/reset-password` | No | Reset password with token |
| PUT | `/change-password` | Yes | Change password (requires current password) |

#### Admin — Users (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create user |
| GET | `/users` | List all users |
| GET | `/users/deactivated` | List deactivated users |
| GET | `/users/reindex` | Reindex users to Algolia |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| PATCH | `/users/:id/deactivate` | Deactivate user |
| PATCH | `/users/:id/activate` | Activate user |
| GET | `/users/:id/status-history` | Get user status change history |

#### Admin — Leads (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads` | List all leads (admin view) |
| GET | `/leads/:id` | Get lead detail |
| PATCH | `/leads/:id/assign` | Assign/reassign lead |
| PUT | `/leads/:id/reopen` | Reopen closed lead |
| POST | `/leads/:id/reopen` | Reopen closed lead (POST alias) |
| GET | `/leads/export` | Export leads (CSV/XLSX/PDF) |
| POST | `/leads/export` | Bulk export leads |
| POST | `/leads/bulk-select` | Bulk select leads |
| POST | `/leads/bulk-assign` | Bulk assign leads |
| GET | `/leads/reindex` | Reindex leads to Algolia |

#### Admin — Field History (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads/:id/field-history` | Get field change history |
| GET | `/leads/:id/field-history/export` | Export field history as CSV |
| GET | `/leads/:id/lead-history` | Get lead history |

#### Admin — Categories (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List all categories |
| POST | `/categories` | Create category |
| GET | `/categories/active` | List active categories |
| GET | `/categories/audit-log` | Category audit log |
| POST | `/categories/seed-defaults` | Seed default taxonomy |
| GET | `/categories/:id` | Get category by ID |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |
| PATCH | `/categories/:id/status` | Toggle category status |
| GET | `/categories/:id/in-use` | Check if category is in use |
| GET | `/categories/:categoryId/sub-categories` | List sub-categories |
| POST | `/categories/:categoryId/sub-categories` | Create sub-category |
| GET | `/categories/:categoryId/sub-categories/active` | List active sub-categories |
| PUT | `/categories/:categoryId/sub-categories/:subCategoryId` | Update sub-category |
| DELETE | `/categories/:categoryId/sub-categories/:subCategoryId` | Delete sub-category |
| GET | `/categories/:categoryId/sub-categories/:subCategoryId/in-use` | Check if sub-category is in use |

#### Admin — Sub-Categories (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subcategories` | List all sub-categories |
| POST | `/subcategories` | Create sub-category |
| GET | `/subcategories/active` | List active sub-categories |
| GET | `/subcategories/:id` | Get sub-category by ID |
| PUT | `/subcategories/:id` | Update sub-category |
| DELETE | `/subcategories/:id` | Delete sub-category |
| PATCH | `/subcategories/:id/status` | Toggle sub-category status |

#### Admin — Services (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/services` | List services |
| POST | `/services` | Create service |
| PUT | `/services/:id` | Update service |
| DELETE | `/services/:id` | Delete service |

#### Admin — Lead Sources (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lead_sources` | List lead sources |
| POST | `/lead_sources` | Create lead source |
| PUT | `/lead_sources/:id` | Update lead source |
| DELETE | `/lead_sources/:id` | Delete lead source |

#### Admin — Dashboard (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/kpis` | Dashboard KPIs |
| GET | `/dashboard/category-volume` | Category volume chart |
| GET | `/dashboard/won-rate-by-source` | Win rate by source |
| GET | `/dashboard/won-rate-by-category` | Win rate by category |
| GET | `/dashboard/category/won-rate` | Win rate by category (alias) |
| GET | `/dashboard/lead-volume-by-category` | Lead volume by category |
| GET | `/dashboard/category/lead-volume` | Lead volume by category (alias) |
| GET | `/dashboard/at-risk` | At-risk leads |

#### Admin — Audit Log (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit-log` | List audit logs |
| GET | `/audit-log/:id` | Get audit log detail |
| GET | `/audit-log/export` | Export audit logs |
| POST | `/audit-log/archive` | Archive old logs |

#### Admin — System (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get all system settings |
| PUT | `/settings/:key` | Update system setting |
| GET | `/system-settings/audit-retention` | Get audit retention config |
| PUT | `/system-settings/audit-retention` | Update audit retention |
| POST | `/test-email` | Test SMTP connection |
| POST | `/reminders/send-daily` | Send daily reminder emails |

#### Admin — Timeline (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads/:id/timeline` | Get lead timeline |
| PUT | `/leads/:id/timeline/:eventId` | Reject (405) — timeline is read-only |
| PATCH | `/leads/:id/timeline/:eventId` | Reject (405) — timeline is read-only |
| DELETE | `/leads/:id/timeline/:eventId` | Reject (405) — timeline is read-only |

#### Marketing Executive — Leads (`/api/marketing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/leads` | Create lead |
| GET | `/leads` | List assigned leads |
| GET | `/leads/:id` | Get lead detail |
| PUT | `/leads/:id/status` | Update lead stage |
| PUT | `/leads/:id/close` | Close lead (Won/Lost) |
| POST | `/leads/:id/close` | Close lead (POST alias) |
| GET | `/leads/export` | Export leads |
| GET | `/leads/check-mobile` | Check duplicate mobile |
| GET | `/leads/check-email` | Check duplicate email |
| POST | `/leads/check-duplicate` | Check duplicate lead |

#### Marketing Executive — Follow-ups (`/api/marketing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/leads/:id/followups` | Create follow-up |
| POST | `/leads/:id/followups/:fid/correction` | Add correction to follow-up |
| PUT | `/leads/:id/followups/:fid` | Reject (405) — follow-ups are immutable |
| PATCH | `/leads/:id/followups/:fid` | Reject (405) — follow-ups are immutable |
| DELETE | `/leads/:id/followups/:fid` | Reject (405) — follow-ups cannot be deleted |
| GET | `/followups/today` | Today's follow-ups |
| GET | `/followups/overdue` | Overdue follow-ups |

#### Marketing Executive — Timeline (`/api/marketing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads/:id/timeline` | Get lead timeline |
| PUT | `/leads/:id/timeline/:eventId` | Reject (405) — timeline is read-only |
| PATCH | `/leads/:id/timeline/:eventId` | Reject (405) — timeline is read-only |
| DELETE | `/leads/:id/timeline/:eventId` | Reject (405) — timeline is read-only |

#### Marketing Executive — Field History (`/api/marketing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads/:id/field-history` | Get field change history |
| GET | `/leads/:id/lead-history` | Get lead history |

#### Marketing Executive — Dashboard (`/api/marketing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Combined dashboard |
| GET | `/dashboard/cards` | Dashboard summary cards |
| GET | `/dashboard/conversion-rate` | Conversion rate |
| GET | `/dashboard/kpis` | Dashboard KPIs |
| GET | `/dashboard/won-rate-by-category` | Win rate by category |
| GET | `/dashboard/category/won-rate` | Win rate by category (alias) |
| GET | `/dashboard/lead-volume-by-category` | Lead volume by category |
| GET | `/dashboard/category/lead-volume` | Lead volume by category (alias) |

#### Marketing Executive — Reference Data (`/api/marketing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lead-sources` | List lead sources |
| GET | `/categories` | List categories |
| GET | `/categories/active` | List active categories |
| GET | `/categories/:categoryId/sub-categories` | List sub-categories |
| GET | `/subcategories/active` | List active sub-categories |
| GET | `/services` | List services |

#### Notifications (mounted on server)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Yes | List user notifications |
| GET | `/api/notifications/count` | Yes | Unread notification count |
| PUT | `/api/notifications/:id/read` | Yes | Mark notification as read |
| PUT | `/api/notifications/read-all` | Yes | Mark all as read |

#### Search (`/api/search`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/global` | Yes | Global search across all entities (Algolia) |

---

## Folder Structure

```
backend/
├── .env.example              # Environment variable template
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
│
├── database/
│   └── schema/
│       ├── init.sql           # Full DDL (13 tables, indexes, constraints, seeds)
│       └── README.md
│
├── scripts/                   # Utility and debug scripts
│   ├── reset-pw.js
│   ├── check_db_details.js
│   ├── check_me_details.js
│   ├── check_mismatches.js
│   ├── qa_checker.js
│   ├── verify_notifications.js
│   ├── test_admin_email_send.js
│   ├── test_admin_notifications.js
│   ├── test_admin_notifications_api.js
│   ├── e2e_final.js
│   ├── e2e_notification_tester.js
│   ├── trace_lead_creation.js
│   ├── rca_trace.js
│   ├── fix_tests.js
│   ├── fix_tests2.js
│   └── update_tests.js
│
├── src/
│   ├── app.js                # Express app setup (middleware, routes, error handler)
│   ├── server.js             # Server entry point (loads env, starts listener)
│   │
│   ├── config/
│   │   ├── db.js             # PostgreSQL connection pool (pg)
│   │   └── supabase.js       # Supabase client (ESM, currently unused)
│   │
│   ├── controllers/          # Route handlers
│   │   ├── adminController.js
│   │   ├── assignController.js
│   │   ├── auditLogController.js
│   │   ├── authController.js
│   │   ├── bulkOperationsController.js
│   │   ├── categoryController.js
│   │   ├── dashboardController.js
│   │   ├── followupController.js
│   │   ├── leadController.js
│   │   ├── leadHistoryController.js
│   │   ├── marketingDashboardController.js
│   │   ├── notificationController.js
│   │   ├── savedViewController.js
│   │   ├── searchController.js
│   │   ├── systemSettingController.js
│   │   └── userController.js
│   │
│   ├── middleware/
│   │   ├── auth.js           # JWT protect + role authorize
│   │   ├── authStageManagement.js  # Re-export alias
│   │   ├── errorHandler.js   # Global error handler
│   │   └── rateLimiter.js    # In-memory sliding window rate limiter
│   │
│   ├── models/               # Data access (raw SQL, Active Record pattern)
│   │   ├── AuditLog.js
│   │   ├── BusinessCategory.js
│   │   ├── BusinessSubCategory.js
│   │   ├── Followup.js
│   │   ├── Lead.js
│   │   ├── LeadHistory.js
│   │   ├── LeadSource.js
│   │   ├── Notification.js
│   │   ├── SavedView.js
│   │   ├── Service.js
│   │   ├── SystemSetting.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── admin.js          # /api/admin/*
│   │   ├── marketing.js      # /api/marketing/*
│   │   └── search.js         # /api/search/*
│   │
│   ├── utils/
│   │   ├── algoliaService.js # Algolia integration (8 indices)
│   │   ├── emailService.js   # Nodemailer SMTP + HTML templates
│   │   ├── passwordUtils.js  # Temp password generator
│   │   ├── response.js       # success()/error() response wrappers
│   │   ├── tokenUtils.js     # JWT token generators
│   │   └── transactionHelper.js  # pg BEGIN/COMMIT/ROLLBACK wrapper
│   │
│   ├── constants/
│   ├── helpers/
│   ├── validations/
│   ├── repositories/
│   ├── services/
│   ├── cron/
│   ├── sockets/
│   └── uploads/
│
├── tests/
│   ├── unit/                 # 16 Jest test files
│   ├── integration/
│   └── e2e/
│
└── exports/                  # Generated CSV/XLSX exports (gitignored)
```

---

## SMTP Configuration

Required for password reset emails, lead assignment notifications, and daily reminders.

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (`465` for SSL, `587` for TLS) | `587` |
| `SMTP_USER` | SMTP username / email address | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password or app-specific password | `your-app-password` |

**Gmail users:** Generate an [App Password](https://myaccount.google.com/apppasswords) (requires 2FA enabled). Use the 16-character password, not your regular Gmail password.

**Testing SMTP:**

```bash
# Via API (requires Admin role)
curl -X POST http://localhost:5000/api/admin/test-email \
  -H "Authorization: Bearer <token>"

# Via script
node scripts/test_admin_email_send.js
```

---

## JWT Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (required) | Secret key for signing tokens. Use a long random string. |
| `JWT_EXPIRES_IN` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiry |
| `JWT_REFRESH_EXPIRES_IN_REMEMBER` | `30d` | Refresh token expiry with "remember me" |

**Token flow:**

1. `POST /api/auth/login` returns `accessToken` + `refreshToken`
2. Send `Authorization: Bearer <accessToken>` on protected requests
3. When access token expires, `POST /api/auth/refresh` with `refreshToken` to get a new pair
4. `POST /api/auth/logout` invalidates the refresh token

---

## Database Configuration

The project connects to PostgreSQL via the `pg` module using a single `DATABASE_URL` connection string.

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://user:pass@localhost:5432/marketing_crm` |

**SSL:** Automatically enabled when `DATABASE_URL` contains `supabase`.

**Connection pool:** Managed by `pg.Pool` in `src/config/db.js`. No explicit pool size configuration — defaults to `pg` defaults.

### Tables (13)

| Table | Description |
|-------|-------------|
| `users` | Admin & Marketing Executive accounts |
| `leads` | Lead records with stage pipeline, priority, category |
| `lead_history` | Field-level change audit trail per lead |
| `followups` | Follow-up records (call/meeting/email logs, outcomes) |
| `notifications` | User notifications |
| `audit_logs` | System-wide audit trail |
| `audit_logs_archive` | Archived audit logs (older than retention) |
| `business_categories` | Lead category taxonomy |
| `business_sub_categories` | Sub-categories under each category |
| `lead_sources` | Lead source definitions |
| `services` | Service catalog |
| `system_settings` | Key-value config (lockout, retention, etc.) |
| `saved_views` | Admin saved filter presets |

---

## Docker Setup

Docker is not configured for the backend in this branch. The backend runs directly with Node.js.

If you need to containerize the backend, create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

And a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env
    depends_on:
      - db
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: marketing_crm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - ./database/schema/init.sql:/docker-entrypoint-initdb.d/init.sql
```

---

## Troubleshooting

### Database connection errors

```
PostgreSQL connection error: connection refused
```

- Ensure PostgreSQL is running: `pg_isready`
- Verify `DATABASE_URL` in `.env` is correct
- Check the database exists: `psql -U postgres -c "\l"`

### Migration failures

```
ERROR: relation "users" already exists
```

The tables already exist. To start fresh:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS marketing_crm;"
psql -U postgres -c "CREATE DATABASE marketing_crm;"
psql -U postgres -d marketing_crm -f database/schema/init.sql
```

### Missing `.env`

```
Error: NODE_ENV is not defined
```

Copy the example and fill in values:

```bash
cp .env.example .env
```

### Port already in use

```
Error: listen EADDRINUSE: address already in use :::5000
```

Kill the process on port 5000:

```bash
# Linux/macOS
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Or change `PORT` in `.env`.

### SMTP issues

```
Error: Invalid login
```

- Use an App Password (not your regular password) for Gmail
- Ensure `SMTP_PORT` matches your provider (`587` for TLS, `465` for SSL)
- Check that `SMTP_HOST` is correct

### JWT issues

```
Invalid or expired token
```

- Ensure `JWT_SECRET` is set in `.env`
- Access tokens expire after `JWT_EXPIRES_IN` (default: 15 minutes)
- Use `POST /api/auth/refresh` to get a new access token

### Algolia errors

```
Algolia index settings configured successfully
```

This is normal on startup. If search is not working:

- Verify `ALGOLIA_APP_ID` and `ALGOLIA_API_KEY` in `.env`
- Ensure indices exist in your Algolia dashboard
- Non-critical: search failures do not block the API

---

## Deployment

### Production Build

```bash
# Install production dependencies only
npm ci --omit=dev

# Set environment
export NODE_ENV=production

# Run migrations
psql "$DATABASE_URL" -f database/schema/init.sql

# Create admin user (if first deploy)
node -e "/* admin creation script from above */"

# Start server
npm start
```

### Environment Variables

Ensure all required variables are set in production:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Strong random secret (e.g. `openssl rand -hex 32`)
- `NODE_ENV=production`
- `SMTP_*` — For email delivery
- `ALGOLIA_*` — For search

### Pre-deployment Checklist

1. Run `database/schema/init.sql` against the production database
2. Create the initial admin user
3. Set `JWT_SECRET` to a strong, unique value
4. Configure SMTP credentials for email delivery
5. Set `CORS_ORIGIN` to your frontend domain
6. Ensure `NODE_ENV=production`

---

## Changelog

### Recent Features

- **Bulk User Activate/Deactivate** — Admin can activate or deactivate multiple users at once
- **Multi-Select Users** — Admin can select multiple users for bulk operations
- **Algolia Integration** — Full-text search across leads, follow-ups, notifications, and audit logs with 8 search indices
- **SMTP Notifications** — Email delivery for lead assignments, password resets, follow-up reminders, and daily digests
- **Dashboard Fixes** — Corrected KPI calculations, category volume, and conversion rate charts
- **Category/Subcategory Fixes** — Fixed CRUD operations, in-use checks, and status toggling
- **Notification Improvements** — Real-time unread count, mark-as-read, bulk mark-all-as-read
- **Follow-up Corrections** — Append-only follow-up records with correction notes (immutability enforced)
- **Timeline Immutability** — PUT/PATCH/DELETE on timeline events returns 405
- **Field History CSV Export** — Admin can export lead field change history as CSV
- **Saved Views** — Admin can save and manage filter presets for lead listing
- **Daily Reminders** — Automated email reminders for overdue and upcoming follow-ups
- **Audit Log Archival** — Configurable retention period with one-click archival
- **Account Lockout** — Configurable failed login threshold and lockout duration
- **Backend Folder Restructure** — Folder structure aligned with main branch architecture (`src/app.js` + `src/server.js` split)
