-- Add soft-delete support to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
