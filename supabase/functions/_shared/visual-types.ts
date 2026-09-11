export interface ImageGenerationRequest {
  generation_id: string;
  force: boolean;
  seed?: number;
}

export class ImageRequestValidationError extends Error {}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseImageGenerationRequest(
  body: unknown,
): ImageGenerationRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ImageRequestValidationError(
      "Request body must be a JSON object",
    );
  }

  const record = body as Record<string, unknown>;
  if (
    typeof record.generation_id !== "string" ||
    !UUID_PATTERN.test(record.generation_id)
  ) {
    throw new ImageRequestValidationError(
      "generation_id is required and must be a valid UUID",
    );
  }

  if (record.force !== undefined && typeof record.force !== "boolean") {
    throw new ImageRequestValidationError("force must be a boolean");
  }

  let seed: number | undefined;
  if (record.seed !== undefined) {
    if (
      typeof record.seed !== "number" ||
      !Number.isSafeInteger(record.seed) ||
      record.seed < 0 ||
      record.seed > 2_147_483_647
    ) {
      throw new ImageRequestValidationError(
        "seed must be an integer between 0 and 2147483647",
      );
    }
    seed = record.seed;
  }

  return {
    generation_id: record.generation_id,
    force: record.force ?? false,
    seed,
  };
}
