import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateJson, LLMError, TransientLLMError } from "./llm-client.ts";

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    previous[key] = Deno.env.get(key);
  }
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }
  return (async () => {
    try {
      await fn();
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          Deno.env.delete(key);
        } else {
          Deno.env.set(key, value);
        }
      }
    }
  })();
}

Deno.test("generateJson in mock mode returns all required fields without network calls", async () => {
  await withEnv({ LLM_MOCK_MODE: "true" }, async () => {
    const failingFetch = (() => {
      throw new Error("network should not be called in mock mode");
    }) as unknown as typeof fetch;

    const result = await generateJson("Some ru text about AI content factory", failingFetch);

    assertEquals(result.model, "mock");
    assert(result.content.title.length > 0);
    assert(result.content.key_points.length >= 3 && result.content.key_points.length <= 5);
    assert(result.content.telegram.length > 0);
    assert(result.content.instagram.length > 0);
    assert(result.content.linkedin.length > 0);
    assert(result.content.image_prompt.length > 0);
  });
});

Deno.test("mock image_prompt forbids on-image text and watermarks", async () => {
  await withEnv({ LLM_MOCK_MODE: "true" }, async () => {
    const result = await generateJson("Some content");
    const prompt = result.content.image_prompt.toLowerCase();

    assert(prompt.includes("no text"));
    assert(prompt.includes("no letters"));
    assert(prompt.includes("no watermark"));
  });
});

Deno.test("generateJson retries transient failures exactly once (2 attempts total)", async () => {
  await withEnv({ LLM_MOCK_MODE: "false", GEMINI_API_KEY: "test-key" }, async () => {
    let callCount = 0;
    const alwaysTimesOut = (() => {
      callCount++;
      return Promise.reject(new DOMException("aborted", "AbortError"));
    }) as unknown as typeof fetch;

    await assertRejects(() => generateJson("prompt", alwaysTimesOut), TransientLLMError);
    assertEquals(callCount, 2);
  });
});

Deno.test("generateJson does not retry non-transient errors", async () => {
  await withEnv({ LLM_MOCK_MODE: "false", GEMINI_API_KEY: "test-key" }, async () => {
    let callCount = 0;
    const badRequestFetch = (() => {
      callCount++;
      return Promise.resolve(new Response("bad request", { status: 400 }));
    }) as unknown as typeof fetch;

    await assertRejects(() => generateJson("prompt", badRequestFetch), LLMError);
    assertEquals(callCount, 1);
  });
});

Deno.test("generateJson fails fast without an API key configured", async () => {
  await withEnv({ LLM_MOCK_MODE: "false", GEMINI_API_KEY: undefined }, async () => {
    await assertRejects(() => generateJson("prompt"), LLMError);
  });
});
