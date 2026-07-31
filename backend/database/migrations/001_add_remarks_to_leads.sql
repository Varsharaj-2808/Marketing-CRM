-- ============================================================
-- Migration: Add remarks TEXT column to leads table
-- File: backend/database/migrations/001_add_remarks_to_leads.sql
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'remarks'
    ) THEN
        ALTER TABLE leads ADD COLUMN remarks TEXT;
        RAISE NOTICE 'Column "remarks" added to table "leads".';
    ELSE
        RAISE NOTICE 'Column "remarks" already exists in table "leads".';
    END IF;
END $$;
