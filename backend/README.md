# Backend - Marketing CRM

Express.js REST API server with PostgreSQL (Supabase) and Algolia search integration.

## Setup

```bash
npm install
cp .env.example .env   # configure your Supabase & SMTP credentials
npm run dev            # starts on http://localhost:5000
```

## Project Structure

```
src/
  app.js              - Express app setup (middleware, routes, error handler)
  server.js           - Server entry point (loads env, starts listener)
  config/
    db.js             - PostgreSQL connection pool (pg)
    supabase.js       - Supabase client
  controllers/        - Route handlers (16 controllers)
  middleware/          - Auth (JWT), role authorization, rate limiter, error handler
  models/             - Data access layer (raw SQL via pg, Active Record pattern)
  routes/             - Express routers (auth, admin, marketing, search)
  utils/              - Email (Nodemailer), Algolia search, tokens, response helpers
  constants/          - Constants
  helpers/            - Helper functions
  validations/        - Request validation
  repositories/       - Data access abstraction
  services/           - Business logic
  cron/               - Scheduled jobs
  sockets/            - WebSocket handlers
  uploads/            - File uploads
tests/
  unit/               - Jest unit tests
scripts/              - Utility & debug scripts
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing secret |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email (Nodemailer) |
| `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY` | Algolia search |
| `CORS_ORIGIN` | Allowed CORS origin (default: `*`) |

## API Routes

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Login (rate-limited) |
| POST | `/logout` | Logout |
| GET | `/profile` | Get current user profile |
| POST | `/refresh` | Refresh access token |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |
| PUT | `/change-password` | Change password |

### Admin (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Users** | | |
| POST | `/users` | Create user |
| GET | `/users` | List users |
| GET | `/users/deactivated` | List deactivated users |
| GET | `/users/:id` | Get user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| PATCH | `/users/:id/deactivate` | Deactivate user |
| PATCH | `/users/:id/activate` | Activate user |
| **Leads** | | |
| GET | `/leads` | List all leads (admin) |
| GET | `/leads/:id` | Get lead detail |
| PATCH | `/leads/:id/assign` | Assign/reassign lead |
| PUT | `/leads/:id/reopen` | Reopen closed lead |
| GET | `/leads/export` | Export leads (CSV/XLSX/PDF) |
| POST | `/leads/export` | Bulk export leads |
| POST | `/leads/bulk-select` | Bulk select leads |
| POST | `/leads/bulk-assign` | Bulk assign leads |
| **Field History** | | |
| GET | `/leads/:id/field-history` | Get field change history |
| GET | `/leads/:id/field-history/export` | Export history as CSV |
| **Timeline** | | |
| GET | `/leads/:id/timeline` | Get lead timeline |
| **Categories** | | |
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |
| PATCH | `/categories/:id/status` | Toggle category status |
| GET | `/categories/:categoryId/sub-categories` | List sub-categories |
| POST | `/categories/:categoryId/sub-categories` | Create sub-category |
| PUT | `/categories/:categoryId/sub-categories/:subCategoryId` | Update sub-category |
| DELETE | `/categories/:categoryId/sub-categories/:subCategoryId` | Delete sub-category |
| **Services** | | |
| GET | `/services` | List services |
| POST | `/services` | Create service |
| PUT | `/services/:id` | Update service |
| DELETE | `/services/:id` | Delete service |
| **Lead Sources** | | |
| GET | `/lead_sources` | List lead sources |
| POST | `/lead_sources` | Create lead source |
| PUT | `/lead_sources/:id` | Update lead source |
| DELETE | `/lead_sources/:id` | Delete lead source |
| **Dashboard** | | |
| GET | `/dashboard/kpis` | Dashboard KPIs |
| GET | `/dashboard/category-volume` | Category volume chart |
| GET | `/dashboard/won-rate-by-source` | Win rate by source |
| GET | `/dashboard/won-rate-by-category` | Win rate by category |
| GET | `/dashboard/lead-volume-by-category` | Lead volume by category |
| GET | `/dashboard/at-risk` | At-risk leads |
| **Audit Log** | | |
| GET | `/audit-log` | List audit logs |
| GET | `/audit-log/:id` | Get audit log detail |
| GET | `/audit-log/export` | Export audit logs |
| POST | `/audit-log/archive` | Archive old logs |
| **System** | | |
| GET | `/settings` | Get system settings |
| PUT | `/settings/:key` | Update setting |
| GET | `/system-settings/audit-retention` | Get audit retention config |
| PUT | `/system-settings/audit-retention` | Update audit retention |
| POST | `/test-email` | Test SMTP connection |
| POST | `/reminders/send-daily` | Send daily reminder emails |

### Marketing Executive (`/api/marketing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Leads** | | |
| POST | `/leads` | Create lead |
| GET | `/leads` | List leads |
| GET | `/leads/:id` | Get lead detail |
| PUT | `/leads/:id/status` | Update lead stage |
| PUT | `/leads/:id/close` | Close lead (Won/Lost) |
| GET | `/leads/export` | Export leads |
| GET | `/leads/check-mobile` | Check duplicate mobile |
| GET | `/leads/check-email` | Check duplicate email |
| POST | `/leads/check-duplicate` | Check duplicate lead |
| **Field History** | | |
| GET | `/leads/:id/field-history` | Get field change history |
| **Timeline** | | |
| GET | `/leads/:id/timeline` | Get lead timeline |
| **Follow-ups** | | |
| POST | `/leads/:id/followups` | Create follow-up |
| POST | `/leads/:id/followups/:fid/correction` | Add correction |
| GET | `/followups/today` | Today's follow-ups |
| GET | `/followups/overdue` | Overdue follow-ups |
| **Dashboard** | | |
| GET | `/dashboard` | Combined dashboard |
| GET | `/dashboard/cards` | Dashboard summary cards |
| GET | `/dashboard/conversion-rate` | Conversion rate |
| GET | `/dashboard/kpis` | Dashboard KPIs |
| **Reference Data** | | |
| GET | `/lead-sources` | List lead sources |
| GET | `/categories` | List categories |
| GET | `/categories/active` | List active categories |
| GET | `/categories/:categoryId/sub-categories` | List sub-categories |
| GET | `/subcategories/active` | List active sub-categories |
| GET | `/services` | List services |
| **Notifications** | | |
| GET | `/notifications` | List notifications |
| GET | `/notifications/count` | Unread notification count |

### Notifications (mounted directly on server)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/count` | Unread count |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |

### Search (`/api/search`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/global` | Global search (Algolia) |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API health status |

## Architecture

- **Entry Point**: `src/server.js` loads env, imports `src/app.js`, starts HTTP listener
- **App Setup**: `src/app.js` configures middleware, mounts routes, attaches error handler
- **Database**: Raw SQL via `pg` Pool (`src/config/db.js`); no ORM
- **Auth**: JWT Bearer tokens with role-based access (`Admin`, `Marketing Executive`)
- **Search**: Algolia integration for global search across leads, follow-ups, notifications
- **Email**: Nodemailer SMTP for password resets, lead notifications, daily reminders
- **Immutability**: Follow-up records and timeline events are append-only (PUT/PATCH/DELETE rejected)

## Testing

```bash
npm test                # run Jest unit tests
```

## Scripts

Utility and debug scripts are in `scripts/`:

```bash
node scripts/reset-pw.js              # Reset a user password
node scripts/check_db_details.js      # Verify DB connection
node scripts/qa_checker.js            # QA data integrity checks
```
