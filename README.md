# The Beyond

AI Content Factory: a Next.js client, a FastAPI content-preview service, and
Supabase migrations/Edge Function for persisted generation jobs.

## Local configuration

Configuration is documented here rather than duplicated across template files.
Keep secrets in your password manager or deployment secret store and create
only the local `.env` file required by the component you run:

- `frontend/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the same values without the
  `NEXT_PUBLIC_` prefix (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) for secure
  server-side API routes. Set `NEXT_PUBLIC_USE_MOCKS=true` only for the offline
  UI demo.
- `backend/.env`: `GEMINI_API_KEY`, optional `TEXT_MODEL`, and
  `LLM_MOCK_MODE=true` for no-cost local testing.
- Supabase Edge Function secrets: `GEMINI_API_KEY`, `TEXT_MODEL`,
  `IMAGE_MODEL`, `IMAGE_PRO_MODEL`, `LLM_MOCK_MODE`, and a comma-separated
  `ALLOWED_ORIGINS` list. Set them with
  `supabase secrets set`; never put them in a checked-in file.

The frontend mock mode is enabled unless `NEXT_PUBLIC_USE_MOCKS=false`. When
using the real preview API, point `NEXT_PUBLIC_API_URL` at FastAPI and start it
with `uvicorn app.main:app --app-dir backend --reload`.

## Start the project (Windows)

Install Node.js 20+ (includes `npm`), Python 3.11+ and, if you use the hosted
generation route, the Supabase CLI. Open two PowerShell terminals in the
repository root.

1. Frontend demo without keys:

   ```powershell
   cd frontend
   npm ci
   $env:NEXT_PUBLIC_USE_MOCKS = "true"
   npm run dev
   ```

   Open `http://localhost:3000`. This is safe for UI development and never
   calls a paid or free model API.

2. Real text generation through FastAPI:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   $env:LLM_MOCK_MODE = "false"
   $env:GEMINI_API_KEY = "your-key-from-a-secret-manager"
   $env:TEXT_MODEL = "gemini-3.1-flash-lite"
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
   ```

   This deliberately does not activate `.venv`, so it works even when
   PowerShell blocks `Activate.ps1`. If activation is preferred for the current
   terminal only, run `Set-ExecutionPolicy -Scope Process Bypass` and then
   `.\.venv\Scripts\Activate.ps1`; do not change the machine-wide execution
   policy.

   In the frontend terminal set `$env:NEXT_PUBLIC_USE_MOCKS = "false"` and
   `$env:NEXT_PUBLIC_API_URL = "http://localhost:8000"`, then restart
   `npm run dev`.

3. Supabase Edge Function (persisted generations): configure secrets with
   `supabase secrets set GEMINI_API_KEY=... TEXT_MODEL=gemini-3.1-flash-lite IMAGE_MODEL=gemini-3.1-flash-image`, then run
   `supabase functions serve generate-content --no-verify-jwt` **only for local
   development**. In production deploy with JWT verification enabled. Start the local
   stack with `supabase start` after installing Docker Desktop. Apply migrations
   with `supabase db reset` only for disposable local data. Set
   `NEXT_PUBLIC_USE_MOCKS=false` in `frontend/.env.local` and run `npm run dev`.

## Production-readiness status

The application now has server-side Supabase Auth routes, HttpOnly session
cookies, protected pages, persisted projects/history, Gemini image generation,
private Storage assets, branded poster/banner SVG renders and a ZIP media-pack
route. It still needs a real Supabase/Gemini smoke test and deployment before
it can be described as a production release. See `docs/tz-compliance-audit.md`
for the deployment checklist and remaining limits.

## How to use the app

1. Create an account and sign in.
2. Create a project, then open **Generate content**.
3. Paste source text or a public article URL; internal addresses such as
   `localhost` are intentionally rejected.
4. Choose the language, visual style and output format, then press
   **Generate**.
5. Review the copy, copy the desired social post and start another variation.
   Configure a brandbook before generating assets that need your logo, colours
   and typography.

## Model policy

The current free-tier text client defaults to `gemini-3.1-flash-lite`. Reserve
`gemini-3.1-flash-image` for image generation and `gemini-3-pro-image` for an
explicit high-quality fallback. The image worker is server-side; it produces a
background image and branded SVG poster/banner assets in private Storage.
The API key stays server-side. When the project moves to a paid Gemini account,
the model selection is configuration-only: use `gemini-2.5-flash-lite` for
low-cost text and `gemini-2.5-flash-image` for photos/edits after confirming
current pricing and availability.

## Authentication policy

Passwords are sent only over HTTPS to Supabase Auth, which hashes them on the
server. Do not hash passwords in the browser. Use Supabase's HttpOnly, Secure,
SameSite session cookies for a production web session; never store JWTs in
`localStorage`. The frontend already sends cross-origin API requests with
cookies (`credentials: include`) and does not retain access tokens. The auth
server must issue a cookie with `HttpOnly; Secure; SameSite=Lax` (or `SameSite=None`
with `Secure` for a separate-site frontend) and protect state-changing routes
against CSRF. The FastAPI CORS allow-list is configured with `ALLOWED_ORIGINS`;
do not use `*` when cookies are enabled.
