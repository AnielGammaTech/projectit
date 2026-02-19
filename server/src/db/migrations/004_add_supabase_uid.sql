-- Add supabase_uid column to users table for Supabase Auth integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_uid UUID;
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users (supabase_uid) WHERE supabase_uid IS NOT NULL;
