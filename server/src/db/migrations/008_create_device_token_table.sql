CREATE TABLE IF NOT EXISTS "DeviceToken" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_devicetoken_data ON "DeviceToken" USING GIN (data);
