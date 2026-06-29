CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description) VALUES
  ('LOCKOUT_THRESHOLD', '5', 'Max failed login attempts before lockout'),
  ('LOCKOUT_WINDOW_MINUTES', '15', 'Lockout duration in minutes'),
  ('RESET_TOKEN_EXPIRY_MINUTES', '30', 'Password reset token expiry in minutes')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON system_settings;
CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();
