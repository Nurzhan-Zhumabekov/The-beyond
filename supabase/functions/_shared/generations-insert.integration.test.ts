/**
 * Integration test: proves the exact INSERT payload built by
 * generate-content/index.ts is accepted by the real, migrated
 * `public.generations` table (including its `generations_source_matches_type`
 * check constraint), and that a payload violating that constraint is
 * rejected by the database — not just by our own TypeScript validation.
 *
 * This talks to a real local Postgres with the project's migrations
 * (001-005 at least) applied — it is NOT mocked. It is opt-in and
 * skipped by default so the plain unit-test run
 * (`deno test --allow-env supabase/functions/_shared`) never needs
 * network access or a running database.
 *
 * To run it against a local Supabase stack (`supabase start`) or any
 * Postgres with the migrations applied:
 *
 *   RUN_DB_INTEGRATION_TESTS=true SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
 *     deno test --allow-net --allow-env supabase/functions/_shared/generations-insert.integration.test.ts
 *
 * SUPABASE_DB_URL defaults to the standard local `supabase start` connection
 * string when not provided.
 */

import { assert, assertEquals } from "@std/assert";
import { Client } from "postgres";
import type { GenerationRequestBody } from "./types.ts";

const RUN_INTEGRATION = Deno.env.get("RUN_DB_INTEGRATION_TESTS") === "true";
const DB_URL =
  Deno.env.get("SUPABASE_DB_URL") ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * Mirrors the exact `.insert({...})` payload built in
 * generate-content/index.ts, so this test breaks if that shape ever
 * drifts from what the real table expects.
 */
function buildGenerationInsertRow(request: GenerationRequestBody) {
  return {
    project_id: request.project_id,
    source_type: request.source_type,
    source_text: request.source_type === "text" ? request.source.trim() : null,
    source_url: request.source_type === "url" ? request.source.trim() : null,
    language: request.language,
    output_type: request.output_type,
    campaign_name: request.campaign_name ?? null,
    image_style: request.image_style ?? null,
    additional_instructions: request.additional_instructions || null,
    status: "processing",
  };
}

async function withTestProject(
  client: Client,
  fn: (projectId: string) => Promise<void>,
) {
  const userId = crypto.randomUUID();
  const projectId = crypto.randomUUID();

  // auth.users / profiles rows are prerequisites of the project_id FK
  // chain (profiles.id -> auth.users.id, projects.user_id -> profiles.id).
  // The project's own `on_auth_user_created` trigger (001_profiles.sql)
  // creates the matching public.profiles row automatically.
  await client.queryArray(
    "insert into auth.users (id, email) values ($1, 'integration-test@example.com')",
    [userId],
  );
  await client.queryArray(
    "insert into public.projects (id, user_id, name) values ($1, $2, 'Integration Test Project')",
    [projectId, userId],
  );

  try {
    await fn(projectId);
  } finally {
    await client.queryArray("delete from public.projects where id = $1", [projectId]);
    await client.queryArray("delete from public.profiles where id = $1", [userId]);
    await client.queryArray("delete from auth.users where id = $1", [userId]);
  }
}

Deno.test({
  name: "INSERT with source_type=text succeeds and stores source_text with source_url null",
  ignore: !RUN_INTEGRATION,
  async fn() {
    const client = new Client(DB_URL);
    await client.connect();
    try {
      await withTestProject(client, async (projectId) => {
        const request: GenerationRequestBody = {
          project_id: projectId,
          source_type: "text",
          source: "  Some article text to summarize.  ",
          language: "ru",
          output_type: "media_pack",
          campaign_name: "AI Conference",
          image_style: "futuristic",
          additional_instructions: "",
        };

        const row = buildGenerationInsertRow(request);
        const result = await client.queryObject<{
          id: string;
          source_text: string | null;
          source_url: string | null;
          status: string;
        }>(
          `insert into public.generations
             (project_id, source_type, source_text, source_url, language,
              output_type, campaign_name, image_style, additional_instructions, status)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           returning id, source_text, source_url, status`,
          [
            row.project_id,
            row.source_type,
            row.source_text,
            row.source_url,
            row.language,
            row.output_type,
            row.campaign_name,
            row.image_style,
            row.additional_instructions,
            row.status,
          ],
        );

        assertEquals(result.rows.length, 1);
        const inserted = result.rows[0];
        assert(inserted.id);
        assertEquals(inserted.source_text, "Some article text to summarize.");
        assertEquals(inserted.source_url, null);
        assertEquals(inserted.status, "processing");
      });
    } finally {
      await client.end();
    }
  },
});

Deno.test({
  name: "INSERT with source_type=url succeeds and stores source_url with source_text null",
  ignore: !RUN_INTEGRATION,
  async fn() {
    const client = new Client(DB_URL);
    await client.connect();
    try {
      await withTestProject(client, async (projectId) => {
        const request: GenerationRequestBody = {
          project_id: projectId,
          source_type: "url",
          source: "https://example.com/article",
          language: "auto",
          output_type: "poster",
        };

        const row = buildGenerationInsertRow(request);
        const result = await client.queryObject<{
          id: string;
          source_text: string | null;
          source_url: string | null;
        }>(
          `insert into public.generations
             (project_id, source_type, source_text, source_url, language, output_type, status)
           values ($1, $2, $3, $4, $5, $6, $7)
           returning id, source_text, source_url`,
          [
            row.project_id,
            row.source_type,
            row.source_text,
            row.source_url,
            row.language,
            row.output_type,
            row.status,
          ],
        );

        assertEquals(result.rows.length, 1);
        assertEquals(result.rows[0].source_url, "https://example.com/article");
        assertEquals(result.rows[0].source_text, null);
      });
    } finally {
      await client.end();
    }
  },
});

Deno.test({
  name: "the database rejects a row that violates generations_source_matches_type",
  ignore: !RUN_INTEGRATION,
  async fn() {
    const client = new Client(DB_URL);
    await client.connect();
    try {
      await withTestProject(client, async (projectId) => {
        let threw = false;
        try {
          // Invalid on purpose: source_type=text but source_url is also set.
          await client.queryArray(
            `insert into public.generations
               (project_id, source_type, source_text, source_url, output_type)
             values ($1, 'text', 'some text', 'https://example.com', 'media_pack')`,
            [projectId],
          );
        } catch (err) {
          threw = true;
          assert(String(err).toLowerCase().includes("generations_source_matches_type"));
        }
        assert(threw, "expected the CHECK constraint to reject the mismatched row");
      });
    } finally {
      await client.end();
    }
  },
});
