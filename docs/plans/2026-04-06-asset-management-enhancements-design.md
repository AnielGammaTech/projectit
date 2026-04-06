# Asset Management Enhancements Design

## Overview

Three features for ManageIT asset management:
1. **Asset Notes** — comment thread per asset with note types
2. **Enhanced Asset Fields** — warranty, network, accessories, supplier
3. **Public Acknowledgment Signing** — tokenized public link for employees to sign asset handovers

## 1. Asset Notes

New entity `AssetNote` with fields: `asset_id`, `content`, `author_email`, `author_name`, `type` (note|maintenance|incident), `created_date`.

Timeline displayed on AssetDetail below details grid. Admin adds notes via text input. Each note shows avatar, timestamp, type badge, content.

## 2. Enhanced Asset Fields

New JSONB fields on existing Asset entity (no schema change needed):
- `warranty_start`, `warranty_end` — dates
- `mac_address`, `hostname`, `ip_address` — network info
- `accessories` — text
- `depreciation_method` — straight-line or none
- `supplier` — vendor name

Added to AssetModal as optional fields, displayed on AssetDetail.

## 3. Public Acknowledgment Signing

### Flow
1. Admin assigns asset -> system creates `AssetAcceptance` with crypto token (7-day expiry)
2. Admin copies public link: `/accept/{token}`
3. Employee opens link (no login), sees asset details + terms + signature canvas
4. Employee signs -> token consumed, signature + metadata stored
5. AssetDetail shows acknowledgment status per assignment

### New Entity: AssetAcceptance
- `token` — 64-char hex (hashed in DB)
- `assignment_id`, `asset_id`, `employee_id`
- `status` — pending|signed|expired
- `expires_at`, `signed_at`
- `signature_data` — base64 PNG
- `signer_name`, `signer_ip`, `signer_ua`
- `asset_snapshot` — JSON snapshot at signing time
- `terms_text` — exact terms displayed

### New Server Route (public)
- `GET /api/accept/:token` — returns acceptance details
- `POST /api/accept/:token/sign` — captures signature

### New Frontend Page (public)
- `/accept/:token` in App.jsx (outside auth)
- Standalone page with ManageIT branding, mobile-friendly

### AssignReturnModal Changes
- Remove inline signature canvas
- After assign, show "Copy Acknowledgment Link" button

### AssetDetail Changes
- Assignment cards show acknowledgment status (pending/signed/expired)
- Signed state shows signature image, name, date, IP

## Database

New table: `AssetAcceptance` (same JSONB pattern as other entities)
New table: `AssetNote` (same JSONB pattern)

```sql
CREATE TABLE IF NOT EXISTS "AssetAcceptance" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_assetacceptance_data ON "AssetAcceptance" USING GIN (data);

CREATE TABLE IF NOT EXISTS "AssetNote" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_assetnote_data ON "AssetNote" USING GIN (data);
```
