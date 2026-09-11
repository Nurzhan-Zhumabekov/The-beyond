/**
 * Shared types and request validation for the content generation pipeline.
 *
 * This mirrors the API contract in the task spec / docs/api-contract.md.
 * No SQL/migrations live here — this only describes the HTTP contract.
 */

export type SourceType = "text" | "url";
export type OutputType = "background" | "poster" | "banner" | "media_pack";
export type Language = "ru" | "kk" | "en" | "auto";
export type GenerationStatus = "pending" | "processing" | "completed" | "failed";

export const SOURCE_TYPES: readonly SourceType[] = ["text", "url"];
export const OUTPUT_TYPES: readonly OutputType[] = [
  "background",
  "poster",
  "banner",
  "media_pack",
];
export const LANGUAGES: readonly Language[] = ["ru", "kk", "en", "auto"];
const MAX_SOURCE_LENGTH = 100_000;
const MAX_SHORT_TEXT_LENGTH = 200;
const MAX_INSTRUCTIONS_LENGTH = 2_000;

export interface GenerationRequestBody {
  project_id: string;
  source_type: SourceType;
  source: string;
  language: Language;
  output_type: OutputType;
  campaign_name?: string;
  image_style?: string;
  additional_instructions?: string;
}

export interface SocialPosts {
  telegram: string;
  instagram: string;
  linkedin: string;
}

export interface UsageInfo {
  llm_calls: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

export interface GenerationResponseBody {
  generation_id: string;
  status: GenerationStatus;
  title?: string;
  key_points?: string[];
  social_posts?: SocialPosts;
  image_prompt?: string;
  assets?: Array<{ id: string; asset_type: "background" | "poster" | "banner"; url: string }>;
  usage: UsageInfo;
  error?: string;
}

/** The strict JSON shape the LLM must return. */
export interface LLMPayload {
  detected_language: string;
  title: string;
  key_points: string[];
  telegram: string;
  instagram: string;
  linkedin: string;
  image_prompt: string;
}

export class ValidationError extends Error {}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates and normalizes a raw JSON request body into a
 * GenerationRequestBody. Throws ValidationError with a clear message
 * on any invalid input.
 */
export function parseGenerationRequest(body: unknown): GenerationRequestBody {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const record = body as Record<string, unknown>;

  if (!isNonEmptyString(record.project_id)) {
    throw new ValidationError("project_id is required and must be a non-empty string");
  }

  if (
    typeof record.source_type !== "string" ||
    !SOURCE_TYPES.includes(record.source_type as SourceType)
  ) {
    throw new ValidationError(`source_type must be one of: ${SOURCE_TYPES.join(", ")}`);
  }

  if (!isNonEmptyString(record.source)) {
    throw new ValidationError("source is required and must not be empty");
  }
  if (record.source.length > MAX_SOURCE_LENGTH) {
    throw new ValidationError(`source must not exceed ${MAX_SOURCE_LENGTH} characters`);
  }

  let language: Language = "auto";
  if (record.language !== undefined && record.language !== null) {
    if (
      typeof record.language !== "string" ||
      !LANGUAGES.includes(record.language as Language)
    ) {
      throw new ValidationError(`language must be one of: ${LANGUAGES.join(", ")}`);
    }
    language = record.language as Language;
  }

  let outputType: OutputType = "media_pack";
  if (record.output_type !== undefined && record.output_type !== null) {
    if (
      typeof record.output_type !== "string" ||
      !OUTPUT_TYPES.includes(record.output_type as OutputType)
    ) {
      throw new ValidationError(`output_type must be one of: ${OUTPUT_TYPES.join(", ")}`);
    }
    outputType = record.output_type as OutputType;
  }

  if (record.campaign_name !== undefined &&
    (!isNonEmptyString(record.campaign_name) || record.campaign_name.length > MAX_SHORT_TEXT_LENGTH)) {
    throw new ValidationError(`campaign_name must be a non-empty string up to ${MAX_SHORT_TEXT_LENGTH} characters`);
  }
  if (record.image_style !== undefined &&
    (!isNonEmptyString(record.image_style) || record.image_style.length > MAX_SHORT_TEXT_LENGTH)) {
    throw new ValidationError(`image_style must be a non-empty string up to ${MAX_SHORT_TEXT_LENGTH} characters`);
  }
  if (record.additional_instructions !== undefined &&
    (typeof record.additional_instructions !== "string" || record.additional_instructions.length > MAX_INSTRUCTIONS_LENGTH)) {
    throw new ValidationError(`additional_instructions must be a string up to ${MAX_INSTRUCTIONS_LENGTH} characters`);
  }

  const campaignName = record.campaign_name as string | undefined;
  const imageStyle = record.image_style as string | undefined;
  const additionalInstructions =
    typeof record.additional_instructions === "string"
      ? record.additional_instructions
      : "";

  return {
    project_id: record.project_id as string,
    source_type: record.source_type as SourceType,
    source: record.source as string,
    language,
    output_type: outputType,
    campaign_name: campaignName,
    image_style: imageStyle,
    additional_instructions: additionalInstructions,
  };
}
