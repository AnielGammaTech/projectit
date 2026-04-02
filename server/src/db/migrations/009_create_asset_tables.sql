-- ManageIT module: Asset, AssetAssignment, Employee tables

CREATE TABLE IF NOT EXISTS "Asset" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_asset_data ON "Asset" USING GIN (data);

CREATE TABLE IF NOT EXISTS "AssetAssignment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_assetassignment_data ON "AssetAssignment" USING GIN (data);

CREATE TABLE IF NOT EXISTS "Employee" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_employee_data ON "Employee" USING GIN (data);
