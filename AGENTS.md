# AGENTS.md

## Cursor Cloud specific instructions

### Overview

ProjectIT is a full-stack project management platform with a React/Vite frontend and Node.js/Express backend. See `README.md` for full feature list, tech stack, and project structure.

### Services

| Service | Port | Start Command | Directory |
|---------|------|---------------|-----------|
| Frontend (Vite) | 5173 | `npm run dev` | `/workspace` |
| Backend (Express) | 3001 | `npm run dev` | `/workspace/server` |
| PostgreSQL | 5432 | `sudo pg_ctlcluster 16 main start` | system |

### PostgreSQL setup

PostgreSQL must be running before the backend can start. Start it with `sudo pg_ctlcluster 16 main start`. The local dev database uses connection string `postgresql://projectit:projectit@localhost:5432/projectit` (already in `server/.env`).

Run migrations before first backend start: `cd server && npm run migrate`.

### External dependencies

- **Supabase** (auth + storage): Required for login/auth flows. Without `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` in root `.env` and `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` in `server/.env`, the app loads and serves the login page but authentication will fail with "Authentication service not configured". The backend still starts and serves the health endpoint and API routes.
- **Anthropic Claude**: Optional. AI features will be unavailable without `ANTHROPIC_API_KEY`.
- **Resend**: Optional. Email features will be unavailable without `RESEND_API_KEY`.

### Commands reference

Refer to `README.md` > Scripts section. Key commands:

- **Lint**: `npm run lint` (frontend only, scoped to `src/components/` and `src/pages/`)
- **Build**: `npm run build` (frontend Vite build)
- **Frontend dev**: `npm run dev` (from root)
- **Backend dev**: `npm run dev` (from `server/`)
- **Migrations**: `npm run migrate` (from `server/`)

### Gotchas

- The backend uses `node --watch` for HMR. Installing new npm packages in `server/` may require restarting the backend process.
- The frontend `.env` uses `VITE_` prefix for env vars (Vite convention).
- ESLint is scoped to `src/components/` and `src/pages/` only — not the full `src/` tree.
- The backend `start` script (`npm start`) runs migrations then starts the server. For dev, use `npm run dev` which only starts the server with `--watch`.
- Both `package-lock.json` files exist — always use `npm` (not yarn/pnpm) as the package manager.
