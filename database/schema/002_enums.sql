-- User role enum
DO $$ BEGIN
  CREATE TYPE users_role_enum AS ENUM ('super_admin', 'admin', 'manager', 'user', 'Admin', 'Marketing Executive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Account status enum
DO $$ BEGIN
  CREATE TYPE users_accountstatus_enum AS ENUM ('active', 'inactive', 'locked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
