-- Create ApiKey table for external API authentication
CREATE TABLE IF NOT EXISTS "ApiKey" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_apikey_data ON "ApiKey" USING GIN (data);
