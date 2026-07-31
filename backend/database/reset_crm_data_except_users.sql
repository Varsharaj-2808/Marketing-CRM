-- ============================================================
-- Marketing CRM - Database Reset Script (TRUNCATE Version)
-- File: backend/database/reset_crm_data_except_users.sql
-- Description: Safely resets/truncates all CRM business data and operational
--              records using TRUNCATE while preserving all User Management
--              data and System Settings intact.
--
-- Safety & Optimization Guarantees:
-- 1. Uses TRUNCATE TABLE ... RESTART IDENTITY for high-performance cleanup.
-- 2. Wrapped in a transaction block (BEGIN...COMMIT).
-- 3. Respects foreign key dependency order and uses CASCADE safely on business tables.
-- 4. Does NOT alter, drop, or recreate any tables or columns.
-- 5. Explicitly preserves all records in `users` and `system_settings`.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Step 1: Truncate Child / Dependent Business Tables
-- ------------------------------------------------------------

-- 1.1 Truncate lead history audit records
-- Table: lead_history (FK to leads.id, users.id)
TRUNCATE TABLE lead_history RESTART IDENTITY;

-- 1.2 Truncate followup interactions
-- Table: followups (FK to leads.id, users.id)
TRUNCATE TABLE followups RESTART IDENTITY;

-- 1.3 Truncate user notifications
-- Table: notifications (FK to users.id, leads.id)
TRUNCATE TABLE notifications RESTART IDENTITY;

-- 1.4 Truncate custom saved views
-- Table: saved_views (FK to users.id)
TRUNCATE TABLE saved_views RESTART IDENTITY;

-- ------------------------------------------------------------
-- Step 2: Truncate Audit Logs & Archival Tables
-- ------------------------------------------------------------

-- 2.1 Truncate archived audit logs
-- Table: audit_logs_archive
TRUNCATE TABLE audit_logs_archive RESTART IDENTITY;

-- 2.2 Truncate live audit logs
-- Table: audit_logs (FK to users.id)
TRUNCATE TABLE audit_logs RESTART IDENTITY;

-- ------------------------------------------------------------
-- Step 3: Truncate Core Business Records & Master Catalogs
-- ------------------------------------------------------------

-- 3.1 Truncate core leads and category/lookup catalogs
-- Truncating business tables with CASCADE satisfies PostgreSQL foreign key checks
-- for referenced master catalogs while leaving 'users' and 'system_settings' untouched.
TRUNCATE TABLE 
  leads,
  business_sub_categories,
  business_categories,
  lead_sources,
  services
RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- EXCLUDED TABLES (Preserved Untouched)
-- ------------------------------------------------------------
-- 1. users: Retains all user accounts, roles, employee IDs, and auth credentials.
-- 2. system_settings: Retains system configuration (lockouts, token expiry, etc.).

COMMIT;
