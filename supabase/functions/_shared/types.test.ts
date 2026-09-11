import { assertEquals, assertThrows } from "@std/assert";
import { parseGenerationRequest, ValidationError } from "./types.ts";

Deno.test("parseGenerationRequest accepts a valid text input", () => {
  const request = parseGenerationRequest({
    project_id: "project-123",
    source_type: "text",
    source: "Some article content to summarize.",
    language: "ru",
    output_type: "media_pack",
    campaign_name: "AI Conference",
    image_style: "futuristic",
  });

  assertEquals(request.project_id, "project-123");
  assertEquals(request.source_type, "text");
  assertEquals(request.language, "ru");
  assertEquals(request.output_type, "media_pack");
});

Deno.test("parseGenerationRequest defaults language and output_type", () => {
  const request = parseGenerationRequest({
    project_id: "project-123",
    source_type: "text",
    source: "Some content",
  });

  assertEquals(request.language, "auto");
  assertEquals(request.output_type, "media_pack");
});

Deno.test("parseGenerationRequest rejects an empty source", () => {
  assertThrows(
    () =>
      parseGenerationRequest({
        project_id: "project-123",
        source_type: "text",
        source: "   ",
      }),
    ValidationError,
  );
});

Deno.test("parseGenerationRequest rejects an invalid source_type", () => {
  assertThrows(
    () =>
      parseGenerationRequest({
        project_id: "project-123",
        source_type: "pdf",
        source: "some text",
      }),
    ValidationError,
  );
});

Deno.test("parseGenerationRequest rejects an invalid output_type", () => {
  assertThrows(
    () =>
      parseGenerationRequest({
        project_id: "project-123",
        source_type: "text",
        source: "some text",
        output_type: "not_a_real_type",
      }),
    ValidationError,
  );
});

Deno.test("parseGenerationRequest rejects a missing project_id", () => {
  assertThrows(
    () => parseGenerationRequest({ source_type: "text", source: "some text" }),
    ValidationError,
  );
});
