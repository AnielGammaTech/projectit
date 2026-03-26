# ProjectIT Security Audit Report

**Date:** 2026-03-26
**Auditor:** Claude Code (Automated)
**Scope:** Full codebase — frontend (React), backend (Express/Node.js), dependencies

---

## Executive Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 3 | 2 | 1 (dependency vulnerabilities — requires manual npm audit fix) |
| HIGH | 6 | 5 | 1 (entity mass assignment — needs schema validation per entity) |
| MEDIUM | 8 | 2 | 6 (see Remaining Issues below) |
| LOW | 3 | 0 | 3 (acceptable risk) |
| INFO | 3 | 0 | 3 (informational) |

**Overall Risk:** Reduced from HIGH to MEDIUM after fixes.

---

## Fixed Issues

### CRITICAL — Fixed

**1. CORS Allows All Origins**
- **File:** `server/src/index.js:34`
- **Issue:** `callback(null, isAllowed || true)` always returned true regardless of allowlist check
- **Fix:** Changed to `callback(null, isAllowed)` — now only allowlisted origins are accepted

**2. OTP Codes Generated with Math.random()**
- **File:** `server/src/services/authService.js:29`
- **Issue:** `Math.random()` is predictable; attackers could guess OTP codes
- **Fix:** Replaced with `crypto.randomInt(100000, 999999)` for cryptographically secure generation

### HIGH — Fixed

**3. Webhook Secret Timing Attack**
- **File:** `server/src/routes/webhooks.js:22`
- **Issue:** String comparison (`!==`) vulnerable to timing attacks
- **Fix:** Replaced with `crypto.timingSafeEqual()` for constant-time comparison

**4. Auth Token Stored in localStorage**
- **File:** `src/api/apiClient.js:16`
- **Issue:** `localStorage.getItem('projectit_token')` fallback accessible to XSS
- **Fix:** Removed localStorage fallback entirely; Supabase session is now the only token source

**5. No File Type Validation on Uploads**
- **File:** `server/src/services/fileService.js:10-13`
- **Issue:** Any file type could be uploaded (including .exe, .html, .svg with scripts)
- **Fix:** Added multer `fileFilter` with MIME type allowlist (images, PDFs, Office docs, CSV, ZIP)

**6. Source Maps Potentially Exposed in Production**
- **File:** `vite.config.js`
- **Issue:** No explicit `sourcemap: false` setting
- **Fix:** Added `build.sourcemap: false` and terser config to strip console.log from production

**7. Console.log Statements in Production**
- **File:** 70+ instances across `src/`
- **Issue:** Console statements could leak API structure and error details
- **Fix:** Added `drop_console: true` and `drop_debugger: true` via terser in production builds

### MEDIUM — Fixed

**8. 50MB JSON Body Parser Limit**
- **File:** `server/src/index.js:40`
- **Issue:** Excessive JSON limit could enable memory exhaustion attacks
- **Fix:** Reduced to 5MB (file uploads use multer separately)

---

## Remaining Issues

### CRITICAL — Requires Manual Intervention

**9. npm Dependency Vulnerabilities (19 total)**
- 1 critical: `@remix-run/router` XSS via open redirects
- 8 high: `flatted` prototype pollution, `glob` command injection, `picomatch` ReDoS
- 10 moderate: `dompurify` XSS, `quill` XSS, `lodash` prototype pollution, `ajv` ReDoS
- **Action Required:** Run `npm audit fix` for non-breaking patches. Plan migration from `react-quill` to `@tiptap/react` or `react-quill-new`.

### HIGH — Requires Schema Work

**10. Entity Create/Update Accept Full req.body**
- **File:** `server/src/routes/entities.js:39,66`
- **Issue:** `entityService.create(entityType, req.body)` passes unvalidated body as JSONB
- **Recommendation:** Define Zod schemas per entity type and validate before passing to service

### MEDIUM — Remaining

**11. dangerouslySetInnerHTML in Chart Component**
- **File:** `src/components/ui/chart.jsx:61`
- **Risk:** Low — uses theme config, not user input. Document that theme data must not include user values.

**12. No Rate Limiting on Entity CRUD Endpoints**
- **File:** `server/src/routes/entities.js`
- **Recommendation:** Add `express-rate-limit` middleware to entity routes

**13. Quill Editor Known XSS Vulnerability**
- **File:** `package.json` (react-quill)
- **Recommendation:** Migrate to `@tiptap/react` or `react-quill-new`

**14. DOMPurify Dependency XSS Bypass**
- **File:** `package.json` (jspdf -> dompurify <=3.2.3)
- **Recommendation:** Update `jspdf` to pull patched `dompurify`

**15. Incoming Webhook Has No Authentication**
- **File:** `server/src/routes/functions/incomingWebhook.js`
- **Recommendation:** Add shared secret or API key requirement

**16. External API Error Messages Expose Internal Details**
- **File:** `server/src/routes/externalApi.js`
- **Recommendation:** Return generic errors; log details server-side only

### LOW — Acceptable Risk

**17. TOTP Secret Displayed in UI** — Standard MFA enrollment behavior
**18. Supabase Anon Key Exposed in Frontend** — By design; verify RLS policies
**19. Stack Traces in Non-Production** — Ensure `NODE_ENV=production` in deployments

### INFO — No Action Required

**20. Helmet configured with defaults** — Consider custom CSP
**21. No explicit cookie security config** — App uses Bearer tokens, not cookies
**22. .env files properly gitignored** — Correct

---

## Recommendations (Priority Order)

1. Run `npm audit fix` for safe dependency patches
2. Migrate from `react-quill` to `@tiptap/react` (fixes XSS + is actively maintained)
3. Add Zod schema validation on entity CRUD routes
4. Add `express-rate-limit` to entity API endpoints
5. Add shared secret to incoming webhook endpoint
6. Sanitize error messages in external API routes
7. Define custom CSP header in Helmet config
8. Verify Supabase RLS policies are enabled on all tables

---

## Testing Methodology

- Static analysis of all source files (frontend + backend)
- Dependency vulnerability scan via `npm audit`
- Pattern matching for known insecure patterns (eval, innerHTML, dangerouslySetInnerHTML)
- Authentication flow review (token handling, session management)
- CORS and security header configuration review
- File upload handling review
- Input validation assessment on API routes
