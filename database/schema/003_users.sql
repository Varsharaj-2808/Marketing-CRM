-- Users table (extends Supabase auth.users with custom columns)
-- Core auth columns managed by Supabase:
--   id UUID PK, email, password, firstName, lastName, etc.
-- Custom application columns added below:

ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role users_role_enum NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "accountStatus" users_accountstatus_enum NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lockoutUntil" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "refreshToken" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetToken" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users (employee_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users ("accountStatus");

-- UpdatedAt trigger
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();
