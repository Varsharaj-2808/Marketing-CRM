-- Migration: Add metadata to notifications
-- Adds a JSONB column to store notification-specific details

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
