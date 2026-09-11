import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cleanText, prepareTextForLLM, truncateForPrompt } from "./content.ts";

Deno.test("cleanText collapses whitespace and removes duplicate lines", () => {
  const input = "Line one.\n\n\n\nLine one.\nLine two.   with   spaces\r\nLine two.   with   spaces";
  const result = cleanText(input);

  assertEquals(result.split("\n").filter((l) => l.trim() !== "").length, 2);
  assert(!result.includes("   "));
});

Deno.test("truncateForPrompt keeps text unchanged when under the limit", () => {
  const text = "short text";
  assertEquals(truncateForPrompt(text, 100), text);
});

Deno.test("truncateForPrompt keeps head and tail when over the limit", () => {
  const text = "A".repeat(5000) + "MIDDLE" + "B".repeat(5000);
  const result = truncateForPrompt(text, 1000);

  assert(result.length <= 1000 + 20);
  assert(result.startsWith("A"));
  assert(result.endsWith("B"));
  assert(result.includes("[...]"));
});

Deno.test("prepareTextForLLM cleans then truncates", () => {
  const text = "Hello   world.\n\n\n\n" + "X".repeat(20000);
  const result = prepareTextForLLM(text, 14000);

  assert(result.length <= 14000);
  assert(result.startsWith("Hello world."));
});
