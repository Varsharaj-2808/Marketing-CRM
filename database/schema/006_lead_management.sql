CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Lead Sources
CREATE TABLE IF NOT EXISTS lead_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business Categories
CREATE TABLE IF NOT EXISTS business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business Sub Categories
CREATE TABLE IF NOT EXISTS business_sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES business_categories(id) ON DELETE CASCADE,
  sub_category_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq BIGSERIAL,
  lead_id VARCHAR(20) UNIQUE,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  email TEXT,
  website TEXT,
  city TEXT,
  lead_source VARCHAR(255) NOT NULL,
  category UUID NOT NULL REFERENCES business_categories(id),
  sub_category UUID REFERENCES business_sub_categories(id),
  service_interested TEXT[],
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('Hot', 'Warm', 'Cold')),
  estimated_value NUMERIC(12, 2),
  assigned_to UUID REFERENCES users(id),
  stage VARCHAR(100) DEFAULT 'New Lead',
  lead_status VARCHAR(100) DEFAULT 'New Lead',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lead History
CREATE TABLE IF NOT EXISTS lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  change_summary TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lead Activities
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(100),
  description TEXT,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
