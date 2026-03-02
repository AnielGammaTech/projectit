-- Stock module: Tool, ToolTransaction, ProductTransaction tables

CREATE TABLE IF NOT EXISTS "Tool" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_tool_data ON "Tool" USING GIN (data);

CREATE TABLE IF NOT EXISTS "ToolTransaction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_tooltransaction_data ON "ToolTransaction" USING GIN (data);

CREATE TABLE IF NOT EXISTS "ProductTransaction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_producttransaction_data ON "ProductTransaction" USING GIN (data);
