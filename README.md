# The-beyond

AI Content Factory hackathon project.

## Local backend

Requirements:

- Docker Desktop with the WSL 2 engine;
- Supabase CLI;
- Deno 2.x.

Start Supabase from the repository root:

```powershell
supabase start
```

In a second terminal, start the content-generation Edge Function:

```powershell
supabase functions serve generate-content
```

Local endpoints:

- API: `http://127.0.0.1:54321`;
- Studio: `http://127.0.0.1:54323`;
- Edge Function: `http://127.0.0.1:54321/functions/v1/generate-content`.

The function uses mock LLM responses by default, so local development does not
consume paid API calls. To test the real provider, copy
`supabase/functions/.env.example` to an ignored local environment file, set
`OPENAI_API_KEY`, and change `LLM_MOCK_MODE` to `false`.

## Backend checks

```powershell
deno fmt --check supabase/functions
deno lint --config supabase/functions/deno.json supabase/functions
deno check --config supabase/functions/deno.json supabase/functions/generate-content/index.ts
deno test --config supabase/functions/deno.json --allow-env supabase/functions/_shared
supabase db lint
```

Database integration tests are opt-in because they require a running local
Supabase database:

```powershell
$env:RUN_DB_INTEGRATION_TESTS = "true"
$env:SUPABASE_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
deno test --config supabase/functions/deno.json --allow-env --allow-net=127.0.0.1:54322 supabase/functions/_shared/generations-insert.integration.test.ts
```

Never commit real API keys or local Supabase credentials.
