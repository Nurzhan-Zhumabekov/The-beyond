import { assertEquals, assertThrows } from "@std/assert";
import {
  LLMResponseParseError,
  parseLlmJson,
  stripMarkdownFence,
} from "./json-parser.ts";

const VALID_PAYLOAD = {
  detected_language: "ru",
  title: "Заголовок",
  key_points: ["Тезис 1", "Тезис 2", "Тезис 3"],
  telegram: "Telegram пост",
  instagram: "Instagram пост",
  linkedin: "LinkedIn пост",
  image_prompt: "Futuristic scene, no text, no letters, no watermark",
};

Deno.test("stripMarkdownFence removes a ```json fenced block", () => {
  const fenced = "```json\n" + JSON.stringify(VALID_PAYLOAD) + "\n```";
  const stripped = stripMarkdownFence(fenced);
  assertEquals(JSON.parse(stripped).title, "Заголовок");
});

Deno.test("stripMarkdownFence leaves plain JSON untouched", () => {
  const raw = JSON.stringify(VALID_PAYLOAD);
  assertEquals(stripMarkdownFence(raw), raw);
});

Deno.test("parseLlmJson parses a markdown-fenced JSON response", () => {
  const fenced = "```json\n" + JSON.stringify(VALID_PAYLOAD) + "\n```";
  const parsed = parseLlmJson(fenced);
  assertEquals(parsed.title, VALID_PAYLOAD.title);
  assertEquals(parsed.key_points.length, 3);
});

Deno.test("parseLlmJson parses a plain JSON response", () => {
  const parsed = parseLlmJson(JSON.stringify(VALID_PAYLOAD));
  assertEquals(parsed.detected_language, "ru");
});

Deno.test("parseLlmJson rejects invalid JSON", () => {
  assertThrows(() => parseLlmJson("not json at all"), LLMResponseParseError);
});

Deno.test("parseLlmJson rejects a response missing required fields", () => {
  const incomplete = { ...VALID_PAYLOAD } as Record<string, unknown>;
  delete incomplete.image_prompt;
  assertThrows(
    () => parseLlmJson(JSON.stringify(incomplete)),
    LLMResponseParseError,
  );
});

Deno.test("parseLlmJson rejects fewer than 3 key_points", () => {
  const bad = { ...VALID_PAYLOAD, key_points: ["Only one"] };
  assertThrows(() => parseLlmJson(JSON.stringify(bad)), LLMResponseParseError);
});

Deno.test("parseLlmJson rejects more than 5 key_points", () => {
  const bad = { ...VALID_PAYLOAD, key_points: ["1", "2", "3", "4", "5", "6"] };
  assertThrows(() => parseLlmJson(JSON.stringify(bad)), LLMResponseParseError);
});

Deno.test("parseLlmJson never executes the payload as code", () => {
  // JSON.parse cannot execute code; a payload that looks like a script
  // is treated as an inert string value, not evaluated.
  const withScriptLikeText = {
    ...VALID_PAYLOAD,
    title: "<script>alert(1)</script>",
  };
  const parsed = parseLlmJson(JSON.stringify(withScriptLikeText));
  assertEquals(parsed.title, "<script>alert(1)</script>");
});
