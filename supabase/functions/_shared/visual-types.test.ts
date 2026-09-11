import { assertEquals, assertThrows } from "@std/assert";
import {
  ImageRequestValidationError,
  parseImageGenerationRequest,
} from "./visual-types.ts";

const generationId = "1a300000-0000-4000-8000-000000000001";

Deno.test("parseImageGenerationRequest applies safe defaults", () => {
  assertEquals(parseImageGenerationRequest({ generation_id: generationId }), {
    generation_id: generationId,
    force: false,
    seed: undefined,
  });
});

Deno.test("parseImageGenerationRequest accepts force and seed", () => {
  assertEquals(
    parseImageGenerationRequest({
      generation_id: generationId,
      force: true,
      seed: 42,
    }),
    { generation_id: generationId, force: true, seed: 42 },
  );
});

Deno.test("parseImageGenerationRequest rejects an invalid UUID", () => {
  assertThrows(
    () => parseImageGenerationRequest({ generation_id: "not-a-uuid" }),
    ImageRequestValidationError,
  );
});

Deno.test("parseImageGenerationRequest rejects non-boolean force", () => {
  assertThrows(
    () =>
      parseImageGenerationRequest({
        generation_id: generationId,
        force: "yes",
      }),
    ImageRequestValidationError,
  );
});

Deno.test("parseImageGenerationRequest rejects an unsafe seed", () => {
  assertThrows(
    () =>
      parseImageGenerationRequest({
        generation_id: generationId,
        seed: -1,
      }),
    ImageRequestValidationError,
  );
});
