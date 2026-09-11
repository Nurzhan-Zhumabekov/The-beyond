# AI Content Factory Frontend

Next.js + TypeScript frontend for the Beyond AI Content Factory.

## Run locally

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Set `NEXT_PUBLIC_USE_MOCKS=false` when the FastAPI backend is available.

## Main routes

- `/login` — authentication
- `/register` — account creation
- `/dashboard` — workspace entry
- `/projects` — project list and project creation
- `/projects/[id]` — project overview
- `/projects/[id]/generate` — text/URL generation flow
- `/projects/[id]/brandbook` — project brandbook settings
- `/projects/[id]/history` — project generation history
- `/projects/[id]/generations/[generationId]` — generated result review
- `/editor/[assetId]` — visual editor controls
- `/history` — history entry page

## API integration

All backend communication is isolated in `src/lib/api.ts` and service modules under `src/services/`. The API client supports Bearer tokens, backend error messages and a mock mode for frontend-only development.

Passwords are never hashed or stored by the frontend. They are submitted to the backend over HTTPS; hashing and persistent credential storage belong to the backend/auth provider.

## Product behavior

Generated content is always reviewed before approval or download. Nothing is automatically published to social networks. Existing generations remain available in history and new variations are created separately.
