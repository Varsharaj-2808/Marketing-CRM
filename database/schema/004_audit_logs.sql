CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(255),
  "resourceId" VARCHAR(50),
  details TEXT,
  "ipAddress" VARCHAR(45),
  "userAgent" VARCHAR(255),
  result VARCHAR(20) NOT NULL DEFAULT 'Success',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource, "resourceId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs ("createdAt" DESC);
