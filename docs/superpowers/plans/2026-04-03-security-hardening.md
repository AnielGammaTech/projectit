# Security & Code Quality Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 7 confirmed security/quality findings from the April 2026 audit — OTP store, webhook auth, pagination limits, rate limiting, error disclosure, and account enumeration.

**Architecture:** Targeted fixes to existing backend files. No new services or dependencies. OTP moves to PostgreSQL (already available), webhook gets HMAC+timestamp replay protection, external API gets limit clamping, error responses get sanitized.

**Tech Stack:** Node.js, Express, PostgreSQL (via existing `pool`), crypto (built-in)

---

## File Map

| File | Responsibility | Changes |
|---|---|---|
| `server/src/services/authService.js` | OTP generation & verification | Move from in-memory Map to PostgreSQL, add attempt counter, normalize error messages |
| `server/src/routes/functions/incomingWebhook.js` | Incoming webhook handler | Add HMAC secret verification + replay protection |
| `server/src/routes/externalApi.js` | External API for QuoteIT | Clamp pagination limits, sanitize error responses |
| `server/src/middleware/rateLimiter.js` | Rate limiting | Add per-user authenticated limiter |
| `server/src/index.js` | Server bootstrap | Add production env guard for required secrets, apply per-user limiter |
| `server/src/db/migrations/010_create_otp_challenges.sql` | OTP challenge table | New table for persistent OTP storage |
| `server/src/db/migrate.js` | Migration registry | Register new migration |

---

### Task 1: Create OTP Challenges Table (H-1)

**Files:**
- Create: `server/src/db/migrations/010_create_otp_challenges.sql`
- Modify: `server/src/db/migrate.js`

- [ ] **Step 1: Create migration file**

```sql
-- OTP challenges: persistent storage with TTL and attempt tracking

CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_email ON otp_challenges (email);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires ON otp_challenges (expires_at);
```

Write this to `server/src/db/migrations/010_create_otp_challenges.sql`.

- [ ] **Step 2: Register migration**

In `server/src/db/migrate.js`, add `'010_create_otp_challenges.sql'` to the migrations array after `'009_create_asset_tables.sql'`.

- [ ] **Step 3: Commit**

```bash
git add server/src/db/migrations/010_create_otp_challenges.sql server/src/db/migrate.js
git commit -m "feat: add OTP challenges table for persistent storage with attempt tracking"
```

---

### Task 2: Move OTP to PostgreSQL + Add Attempt Cap (H-1, L-2)

**Files:**
- Modify: `server/src/services/authService.js`

- [ ] **Step 1: Replace in-memory OTP store with PostgreSQL**

In `server/src/services/authService.js`, add `pool` import at the top if not already present (check — it's likely already imported for user queries).

Remove the line:
```javascript
const otpStore = new Map(); // email → { code, expiresAt }
```

- [ ] **Step 2: Rewrite `sendOtpCode` method**

Replace the `sendOtpCode` method's OTP storage section. After generating the code (`const code = String(crypto.randomInt(100000, 999999));`), replace:

```javascript
const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
otpStore.set(lowerEmail, { code, expiresAt });

// Clean up expired codes periodically
for (const [key, val] of otpStore) {
  if (val.expiresAt < Date.now()) otpStore.delete(key);
}
```

With:

```javascript
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

// Invalidate any existing challenges for this email
await pool.query(
  'DELETE FROM otp_challenges WHERE email = $1',
  [lowerEmail]
);

// Store new challenge
await pool.query(
  'INSERT INTO otp_challenges (email, code, expires_at) VALUES ($1, $2, $3)',
  [lowerEmail, code, expiresAt.toISOString()]
);

// Clean up expired challenges
await pool.query('DELETE FROM otp_challenges WHERE expires_at < NOW()');
```

- [ ] **Step 3: Rewrite `verifyOtpCode` method**

Replace the OTP verification logic in `verifyOtpCode`. Replace:

```javascript
const stored = otpStore.get(lowerEmail);
if (!stored) {
  throw Object.assign(new Error('No verification code found. Please request a new one.'), { status: 400 });
}

if (Date.now() > stored.expiresAt) {
  otpStore.delete(lowerEmail);
  throw Object.assign(new Error('Code has expired. Please request a new one.'), { status: 400 });
}

if (stored.code !== code.trim()) {
  throw Object.assign(new Error('Invalid code. Please check and try again.'), { status: 400 });
}

// Code is valid — consume it
otpStore.delete(lowerEmail);
```

With:

```javascript
const { rows: challenges } = await pool.query(
  'SELECT * FROM otp_challenges WHERE email = $1 AND consumed = FALSE ORDER BY created_at DESC LIMIT 1',
  [lowerEmail]
);

if (challenges.length === 0) {
  throw Object.assign(new Error('No verification code found. Please request a new one.'), { status: 400 });
}

const challenge = challenges[0];

if (new Date() > new Date(challenge.expires_at)) {
  await pool.query('DELETE FROM otp_challenges WHERE id = $1', [challenge.id]);
  throw Object.assign(new Error('Code has expired. Please request a new one.'), { status: 400 });
}

if (challenge.attempts >= challenge.max_attempts) {
  await pool.query('DELETE FROM otp_challenges WHERE id = $1', [challenge.id]);
  throw Object.assign(new Error('Too many attempts. Please request a new code.'), { status: 429 });
}

if (challenge.code !== code.trim()) {
  // Increment attempt counter
  await pool.query(
    'UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1',
    [challenge.id]
  );
  throw Object.assign(new Error('Invalid code. Please check and try again.'), { status: 400 });
}

// Code is valid — consume it
await pool.query('DELETE FROM otp_challenges WHERE email = $1', [lowerEmail]);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/authService.js
git commit -m "fix(H-1,L-2): move OTP to PostgreSQL with TTL and per-challenge attempt cap"
```

---

### Task 3: Normalize OTP Response to Prevent Account Enumeration (L-1)

**Files:**
- Modify: `server/src/services/authService.js`

- [ ] **Step 1: Change the "No account found" error**

In `sendOtpCode`, find:

```javascript
if (rows.length === 0) {
  throw Object.assign(new Error('No account found with this email'), { status: 404 });
}
```

Replace with:

```javascript
if (rows.length === 0) {
  // Return success-style response to prevent account enumeration
  // Log internally for monitoring
  console.warn(`OTP requested for non-existent email: ${lowerEmail}`);
  return { success: true, message: 'If an account exists with this email, a verification code has been sent.' };
}
```

- [ ] **Step 2: Update the success return at the end of sendOtpCode**

Find the success return (after sending the email) and make it match the same message format:

```javascript
return { success: true, message: 'If an account exists with this email, a verification code has been sent.' };
```

- [ ] **Step 3: Update the auth route handler**

Check `server/src/routes/auth.js` for the endpoint that calls `sendOtpCode`. Make sure it returns the result directly without wrapping it differently for success vs error cases. The route should return 200 for both existing and non-existing emails.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/authService.js server/src/routes/auth.js
git commit -m "fix(L-1): normalize OTP response to prevent account enumeration"
```

---

### Task 4: Add Webhook Secret + Replay Protection (M-1, M-2)

**Files:**
- Modify: `server/src/routes/functions/incomingWebhook.js`
- Modify: `server/src/index.js`

- [ ] **Step 1: Rewrite incomingWebhook.js with HMAC + timestamp**

Replace the entire content of `server/src/routes/functions/incomingWebhook.js`:

```javascript
import entityService from '../../services/entityService.js';
import crypto from 'crypto';

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  try {
    const configuredSecret = process.env.INCOMING_WEBHOOK_SECRET;

    if (!configuredSecret) {
      console.error('[Webhook] INCOMING_WEBHOOK_SECRET not configured — rejecting request');
      return res.status(503).json({ error: 'Webhook endpoint not configured' });
    }

    // Verify HMAC signature
    const signature = req.headers['x-projectit-signature'];
    const timestamp = req.headers['x-projectit-timestamp'];

    if (!signature || !timestamp) {
      // Fall back to simple secret comparison for backwards compatibility
      const providedSecret = req.headers['x-projectit-webhook-secret'];
      if (!providedSecret) {
        return res.status(401).json({ error: 'Missing authentication headers' });
      }

      const expected = Buffer.from(configuredSecret);
      const received = Buffer.from(String(providedSecret));
      if (expected.length !== received.length || !crypto.timingSafeEqual(received, expected)) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
      }
    } else {
      // HMAC signature verification with replay protection
      const tsNum = parseInt(timestamp, 10);
      if (isNaN(tsNum) || Math.abs(Date.now() - tsNum) > REPLAY_WINDOW_MS) {
        return res.status(401).json({ error: 'Request timestamp expired or invalid' });
      }

      const body = JSON.stringify(req.body || {});
      const expectedSig = crypto
        .createHmac('sha256', configuredSecret)
        .update(`${timestamp}.${body}`)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSig);
      const receivedBuf = Buffer.from(String(signature));
      if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const source = req.query?.source;
    if (!source) {
      return res.status(400).json({ error: 'Missing required query parameter: source' });
    }

    const body = req.body || {};
    const details = JSON.stringify(body);
    const truncated = details.length > 10000 ? details.slice(0, 10000) + '...[truncated]' : details;

    await entityService.create('AuditLog', {
      action: 'incoming_webhook',
      actor_name: source,
      actor_email: 'system',
      details: truncated,
      ip_address: req.headers['x-forwarded-for'] || 'unknown',
    });

    return res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

- [ ] **Step 2: Add production startup guard in index.js**

In `server/src/index.js`, add this check right before `app.listen(PORT, () => {`:

```javascript
// Production env guards — fail fast if required secrets are missing
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production') {
  const requiredSecrets = ['INCOMING_WEBHOOK_SECRET'];
  const missing = requiredSecrets.filter(s => !process.env[s]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required production secrets: ${missing.join(', ')}`);
    console.error('Set these environment variables before starting in production.');
    process.exit(1);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/functions/incomingWebhook.js server/src/index.js
git commit -m "fix(M-1,M-2): require webhook secret in production, add HMAC replay protection"
```

---

### Task 5: Clamp External API Pagination Limits (M-3, L-3)

**Files:**
- Modify: `server/src/routes/externalApi.js`

- [ ] **Step 1: Add limit clamping constant and helper**

At the top of `server/src/routes/externalApi.js`, after the existing constants, add:

```javascript
const INTERNAL_ERROR_MESSAGE = 'Internal server error';
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 50;

function clampLimit(limitParam) {
  if (!limitParam) return DEFAULT_PAGE_LIMIT;
  const parsed = parseInt(limitParam, 10);
  if (isNaN(parsed) || parsed < 1) return DEFAULT_PAGE_LIMIT;
  return Math.min(parsed, MAX_PAGE_LIMIT);
}
```

- [ ] **Step 2: Replace all `limit ? parseInt(limit) : 50` with `clampLimit(limit)`**

Find these two lines (around line 168 and 170):

```javascript
projects = await entityService.filter('Project', filter, sort || '-created_date', limit ? parseInt(limit) : 50);
```
```javascript
projects = await entityService.list('Project', sort || '-created_date', limit ? parseInt(limit) : 50);
```

Replace both with:

```javascript
projects = await entityService.filter('Project', filter, sort || '-created_date', clampLimit(limit));
```
```javascript
projects = await entityService.list('Project', sort || '-created_date', clampLimit(limit));
```

- [ ] **Step 3: Replace all `err.message` error responses with generic message**

Replace all 6 occurrences of:
```javascript
return res.status(500).json({ error: err.message });
```

With:
```javascript
return res.status(500).json({ error: INTERNAL_ERROR_MESSAGE });
```

These are on lines 138, 218, 285, 318, 361, 388.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/externalApi.js
git commit -m "fix(M-3,L-3): clamp pagination limit to 100 max, sanitize error responses"
```

---

### Task 6: Add Per-User Authenticated Rate Limiter (M-4)

**Files:**
- Modify: `server/src/middleware/rateLimiter.js`
- Modify: `server/src/index.js`

- [ ] **Step 1: Add per-user limiter to rateLimiter.js**

Add this new limiter at the end of `server/src/middleware/rateLimiter.js`:

```javascript
// Per-user limiter for authenticated routes — applied after auth middleware
// 120 requests per user per minute (keyed by email, not IP)
export const perUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => req.user?.email || 'anonymous',
  message: { error: 'Too many requests from your account. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.user, // Only apply to authenticated requests
});
```

- [ ] **Step 2: Apply per-user limiter to authenticated routes in index.js**

In `server/src/index.js`, update the import:

```javascript
import { globalLimiter, perUserLimiter } from './middleware/rateLimiter.js';
```

Then add `perUserLimiter` after `authMiddleware` on the entity and integration routes:

```javascript
app.use('/api/entities', authMiddleware, perUserLimiter, entityRoutes);
app.use('/api/integrations', authMiddleware, perUserLimiter, integrationRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/rateLimiter.js server/src/index.js
git commit -m "fix(M-4): add per-user rate limiter on authenticated routes after auth middleware"
```

---

### Task 7: Run SQL Migration on Production + Staging

This is a manual step — not code.

- [ ] **Step 1: Run the OTP table migration on production Supabase**

```sql
CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_email ON otp_challenges (email);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires ON otp_challenges (expires_at);
```

- [ ] **Step 2: Run on staging Supabase**

Same SQL as above.

- [ ] **Step 3: Set `INCOMING_WEBHOOK_SECRET` in Railway production**

In Railway → api service → production environment → Variables, add:
```
INCOMING_WEBHOOK_SECRET=<generate a random 64-char hex string>
```

Generate with: `openssl rand -hex 32`
