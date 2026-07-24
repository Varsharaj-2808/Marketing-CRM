-- ============================================================
-- Marketing CRM - Database Schema (PostgreSQL / Supabase)
-- Run this file to create all tables from scratch.
--   psql "$DATABASE_URL" -f database/schema/init.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "employee_id"   TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  "firstName"     TEXT,
  "lastName"      TEXT,
  email           TEXT UNIQUE NOT NULL,
  mobile          TEXT UNIQUE NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('Admin', 'Marketing Executive')),
  "accountStatus" TEXT NOT NULL DEFAULT 'active' CHECK ("accountStatus" IN ('active', 'inactive', 'locked')),
  password        TEXT NOT NULL,
  department      TEXT,
  "refreshToken"  TEXT,
  "resetToken"    TEXT,
  "resetTokenExpiry" TIMESTAMP,
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockoutUntil"  TIMESTAMP,
  "lastLoginAt"   TIMESTAMP,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. business_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS business_categories (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. business_sub_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS business_sub_categories (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id       UUID NOT NULL REFERENCES business_categories(id) ON DELETE CASCADE,
  sub_category_name TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. lead_sources
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_sources (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "lead_id"            TEXT UNIQUE NOT NULL,
  "company_name"       TEXT NOT NULL,
  "contact_person"     TEXT NOT NULL,
  "mobile_number"      TEXT NOT NULL,
  email                TEXT,
  website              TEXT,
  city                 TEXT,
  "lead_source"        TEXT,
  category             UUID REFERENCES business_categories(id) ON DELETE SET NULL,
  "sub_category"       UUID REFERENCES business_sub_categories(id) ON DELETE SET NULL,
  "service_interested"  JSONB,
  priority             TEXT NOT NULL DEFAULT 'Warm' CHECK (priority IN ('Hot', 'Warm', 'Cold')),
  "estimated_value"    NUMERIC,
  "assigned_to"        UUID REFERENCES users(id) ON DELETE SET NULL,
  "assigned_at"        TIMESTAMP,
  stage                TEXT NOT NULL DEFAULT 'New',
  "lead_status"        TEXT CHECK ("lead_status" IN ('Won', 'Lost') OR "lead_status" IS NULL),
  "lost_reason"        TEXT,
  "final_deal_value"   NUMERIC,
  "closure_date"       DATE,
  "next_followup_date" TIMESTAMP,
  "proposal_value"     NUMERIC,
  "remarks"            TEXT,
  "deleted_at"         TIMESTAMP,
  is_deleted           BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. lead_history
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_history (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "lead_id"            UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  "field_name"         TEXT,
  "old_value"          TEXT,
  "new_value"          TEXT,
  "change_summary"     TEXT,
  "changed_by"         UUID REFERENCES users(id) ON DELETE SET NULL,
  reason               TEXT,
  metadata             JSONB,
  "is_system_generated" BOOLEAN DEFAULT FALSE,
  "changed_at"         TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. followups
-- ============================================================
CREATE TABLE IF NOT EXISTS followups (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "lead_id"            UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  "followup_type"      TEXT NOT NULL CHECK ("followup_type" IN ('Call', 'WhatsApp', 'Email', 'Online Meeting', 'Client Meeting', 'Demo', 'Proposal Discussion')),
  outcome              TEXT NOT NULL CHECK (outcome IN ('Interested', 'Need More Info', 'Proposal Requested', 'Budget Discussion', 'Decision Pending', 'Not Interested')),
  notes                TEXT,
  "next_followup_date" TIMESTAMP,
  "proposal_amount"    NUMERIC,
  "stage_at_log"       TEXT,
  "created_by"         UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  correction_notes     TEXT,
  "correction_by"      UUID REFERENCES users(id) ON DELETE SET NULL,
  "correction_at"      TIMESTAMP
);

-- ============================================================
-- 9. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "notification_type" TEXT NOT NULL DEFAULT 'lead_assigned',
  "lead_id"          UUID REFERENCES leads(id) ON DELETE SET NULL,
  message            TEXT NOT NULL,
  is_read            BOOLEAN DEFAULT FALSE,
  metadata           JSONB,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"   UUID REFERENCES users(id) ON DELETE SET NULL,
  email       TEXT DEFAULT '',
  action      TEXT DEFAULT '',
  resource    TEXT DEFAULT '',
  "resourceId" TEXT DEFAULT '',
  details     TEXT DEFAULT '',
  "ipAddress" TEXT DEFAULT '',
  "userAgent" TEXT DEFAULT '',
  result      TEXT DEFAULT 'Success',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. audit_logs_archive (mirror of audit_logs for archival)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs_archive (
  id          UUID PRIMARY KEY,
  "user_id"   UUID,
  email       TEXT,
  action      TEXT,
  resource    TEXT,
  "resourceId" TEXT,
  details     TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  result      TEXT,
  "createdAt" TIMESTAMP,
  created_at  TIMESTAMP
);

-- ============================================================
-- 12. system_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT
);

-- ============================================================
-- 13. saved_views
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_views (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  filters     JSONB NOT NULL DEFAULT '{}',
  "created_by" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(name, "created_by")
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to    ON leads("assigned_to");
CREATE INDEX IF NOT EXISTS idx_leads_stage          ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status    ON leads("lead_status");
CREATE INDEX IF NOT EXISTS idx_leads_category       ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_created_at     ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup  ON leads("next_followup_date");

CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history("lead_id");
CREATE INDEX IF NOT EXISTS idx_lead_history_changed ON lead_history("changed_at");

CREATE INDEX IF NOT EXISTS idx_followups_lead_id    ON followups("lead_id");
CREATE INDEX IF NOT EXISTS idx_followups_created_at ON followups(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications("user_id");
CREATE INDEX IF NOT EXISTS idx_notifications_read   ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user      ON audit_logs("user_id");
CREATE INDEX IF NOT EXISTS idx_audit_logs_action    ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created   ON audit_logs("createdAt");

CREATE INDEX IF NOT EXISTS idx_subcategories_cat    ON business_sub_categories("category_id");

-- ============================================================
-- Default system settings
-- ============================================================
INSERT INTO system_settings (key, value, description) VALUES
  ('LOCKOUT_THRESHOLD', '5', 'Max failed login attempts before lockout'),
  ('LOCKOUT_WINDOW_MINUTES', '15', 'Lockout duration in minutes'),
  ('RESET_TOKEN_EXPIRY_MINUTES', '30', 'Password reset token expiry in minutes'),
  ('audit_log_retention_months', '12', 'Months to keep audit logs before archival')
ON CONFLICT (key) DO NOTHING;
