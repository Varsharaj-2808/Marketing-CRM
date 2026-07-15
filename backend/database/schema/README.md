# Database Schema

PostgreSQL schema for Marketing CRM.

## Files

- `init.sql` — Full DDL: tables, indexes, constraints, and seed data

## Tables (13)

| Table | Description |
|-------|-------------|
| `users` | Admin & Marketing Executive accounts |
| `leads` | Lead records with stage pipeline, priority, category |
| `lead_history` | Field-level change audit trail per lead |
| `followups` | Follow-up records (call/meeting/email logs, outcomes) |
| `notifications` | User notifications |
| `audit_logs` | System-wide audit trail |
| `audit_logs_archive` | Archived audit logs |
| `business_categories` | Lead category taxonomy |
| `business_sub_categories` | Sub-categories under each category |
| `lead_sources` | Lead source definitions |
| `services` | Service catalog |
| `system_settings` | Key-value config |
| `saved_views` | Admin saved filter presets |

## Running

```bash
# Local PostgreSQL
psql -U postgres -d marketing_crm -f database/schema/init.sql

# Using DATABASE_URL
psql "$DATABASE_URL" -f database/schema/init.sql

# Reset (drop + recreate)
psql -U postgres -c "DROP DATABASE IF EXISTS marketing_crm;"
psql -U postgres -c "CREATE DATABASE marketing_crm;"
psql -U postgres -d marketing_crm -f database/schema/init.sql
```
