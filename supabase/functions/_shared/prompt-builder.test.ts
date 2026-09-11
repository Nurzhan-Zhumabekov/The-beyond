import { assert } from "@std/assert";
import { buildGenerationPrompt } from "./prompt-builder.ts";
import type { GenerationRequestBody } from "./types.ts";

const BASE_REQUEST: GenerationRequestBody = {
  project_id: "project-123",
  source_type: "text",
  source: "Some article text",
  language: "ru",
  output_type: "media_pack",
  campaign_name: "AI Conference",
  image_style: "futuristic",
  additional_instructions: "",
};

Deno.test("buildGenerationPrompt always instructs no text/letters/watermark for image_prompt", () => {
  const prompt = buildGenerationPrompt(BASE_REQUEST, "prepared source text");
  assert(prompt.includes("no text, no letters, no watermark"));
});

Deno.test("buildGenerationPrompt includes campaign name and style as context, not as image text", () => {
  const prompt = buildGenerationPrompt(BASE_REQUEST, "prepared source text");
  assert(prompt.includes("AI Conference"));
  assert(prompt.includes("futuristic"));
  assert(prompt.includes("do not render as image text"));
});

Deno.test("buildGenerationPrompt embeds the prepared source text", () => {
  const prompt = buildGenerationPrompt(BASE_REQUEST, "UNIQUE_MARKER_TEXT");
  assert(prompt.includes("UNIQUE_MARKER_TEXT"));
});
