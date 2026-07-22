# Database Migrations

This directory contains standalone SQL migration files used to safely alter existing database tables without modifying original initialization schemas.

## Migration Files

- `001_add_remarks_to_leads.sql`: Safe `ALTER TABLE` PL/pgSQL block adding the `remarks TEXT` column to the `leads` table if it does not already exist.

## Running Migrations

Using psql:
```bash
psql "$DATABASE_URL" -f database/migrations/001_add_remarks_to_leads.sql
```

Using Node.js runner:
```bash
node scripts/migrate_add_remarks.js
```
