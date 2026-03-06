# Changelog

## [Unreleased] - 2026-03-06

### Fixed
- **Doc scan returning wrong parts** - Images uploaded via "Scan Doc/Image" were sent to Claude as plain text URLs instead of vision content blocks. Claude never saw the actual image and hallucinated random parts. Now images are sent as `type: 'image'` content blocks using the Anthropic vision API.
- **PDF scan not reading documents** - PDFs were also sent as text URL references. Now sent as `type: 'document'` content blocks so Claude can parse and extract data from uploaded PDFs.

### Security
- **27 function endpoints were publicly accessible** - The `/api/functions/:name` route used `optionalAuth`, allowing unauthenticated access to email sending, LLM invocation, third-party syncs, workflow execution, and settings modification. Functions are now split into public (webhooks with their own secret validation) and authenticated (require valid user session).
- **Admin-only guards on settings endpoints** - `claudeAI.saveSettings` and `agentBridge.saveSettings` now require admin role, preventing regular users from modifying AI integration configuration or API keys.
- **Rate limiting on costly endpoints** - Added `express-rate-limit` to protect against credit burning and abuse:
  - LLM, email, SMS, and document extraction: 20 requests per user per 15 minutes
  - File uploads: 30 per user per 15 minutes
  - Auth endpoints (login, OTP): 10 attempts per IP per 15 minutes
  - Public webhooks: 60 per IP per 15 minutes
- **HaloPSA webhook secret bypass fixed** - Previously, if no webhook secret was configured, all requests were accepted. Now rejects requests when the secret is not configured.
- **Incoming webhook validation** - Added required `source` query parameter and payload size truncation (10KB) to prevent anonymous audit log spam.

### Known Limitations
- No Row Level Security (RLS) policies on Supabase tables. All access control is application-level only. The Supabase anon key is used only for auth, not direct DB queries, but RLS should be added as defense-in-depth.
