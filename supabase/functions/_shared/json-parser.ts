/**
 * Parses and validates the strict JSON payload the LLM is asked to
 * return. Uses JSON.parse only (never eval / Function constructor), so
 * LLM output is never treated as executable code or HTML.
 */

import type { LLMPayload } from "./types.ts";

export class LLMResponseParseError extends Error {}

const REQUIRED_FIELDS = [
  "detected_language",
  "title",
  "key_points",
  "telegram",
  "instagram",
  "linkedin",
  "image_prompt",
] as const;

const REQUIRED_STRING_FIELDS = [
  "detected_language",
  "title",
  "telegram",
  "instagram",
  "linkedin",
  "image_prompt",
] as const;

const MIN_KEY_POINTS = 3;
const MAX_KEY_POINTS = 5;

/** Strips a ```json ... ``` or ``` ... ``` fence wrapping the payload, if present. */
export function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/** Parses raw LLM text output into a validated LLMPayload, or throws. */
export function parseLlmJson(rawText: string): LLMPayload {
  const cleaned = stripMarkdownFence(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new LLMResponseParseError(`LLM response is not valid JSON: ${message}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new LLMResponseParseError("LLM response must be a JSON object");
  }

  const record = parsed as Record<string, unknown>;

  const missing = REQUIRED_FIELDS.filter((field) => !(field in record));
  if (missing.length > 0) {
    throw new LLMResponseParseError(
      `LLM response is missing required fields: ${missing.join(", ")}`,
    );
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    const value = record[field];
    if (typeof value !== "string" || value.trim() === "") {
      throw new LLMResponseParseError(
        `LLM response field '${field}' must be a non-empty string`,
      );
    }
  }

  const keyPoints = record.key_points;
  if (
    !Array.isArray(keyPoints) ||
    keyPoints.length < MIN_KEY_POINTS ||
    keyPoints.length > MAX_KEY_POINTS ||
    !keyPoints.every((point) => typeof point === "string" && point.trim() !== "")
  ) {
    throw new LLMResponseParseError(
      `LLM response must contain between ${MIN_KEY_POINTS} and ${MAX_KEY_POINTS} non-empty string key_points`,
    );
  }

  return {
    detected_language: record.detected_language as string,
    title: record.title as string,
    key_points: keyPoints as string[],
    telegram: record.telegram as string,
    instagram: record.instagram as string,
    linkedin: record.linkedin as string,
    image_prompt: record.image_prompt as string,
  };
}
