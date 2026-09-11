/**
 * POST /functions/v1/generate-content
 *
 * Takes text or a URL, runs it through the LLM pipeline, persists the
 * result into `generations`, and returns the structured result.
 *
 * Ownership/RLS, auth, storage and migrations are owned by the
 * feature/supabase-core branch. This function only ever queries
 * Postgres through a Supabase client scoped to the caller's own JWT,
 * so row-level security enforces per-user access — it never uses the
 * service role key.
 *
 * Error contract: every error response (both top-level HTTP errors and
 * a failed generation's `error` field) uses
 * `{ "error": { "code": "...", "message": "..." } }`, and a failure
 * that happens after the generation record is created is returned with
 * a non-200 HTTP status matching its category (422 for a bad/unsafe
 * source URL, 502 for an upstream LLM failure, 500 for an internal
 * error) rather than always answering 200.
 */

import { createClient } from "@supabase/supabase-js";
import { errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  type GenerationRequestBody,
  type GenerationResponseBody,
  parseGenerationRequest,
  type SocialPosts,
  type UsageInfo,
  ValidationError,
} from "../_shared/types.ts";
import { prepareTextForLLM } from "../_shared/content.ts";
import {
  ExtractionError,
  extractTextFromUrl,
} from "../_shared/url-extractor.ts";
import { buildGenerationPrompt } from "../_shared/prompt-builder.ts";
import { generateJson, LLMError } from "../_shared/llm-client.ts";
import { LLMResponseParseError } from "../_shared/json-parser.ts";
import { calculateEstimatedCost } from "../_shared/cost-calculator.ts";

/** Raised when persisting the completed generation to Postgres fails. */
class PersistError extends Error {}

interface ClassifiedError {
  code: string;
  status: number;
  /** Safe to send back to the client. */
  clientMessage: string;
  /** Stored in generations.error_message; may be more detailed. */
  dbMessage: string;
}

function classifyPipelineError(err: unknown): ClassifiedError {
  if (err instanceof ExtractionError) {
    return {
      code: "EXTRACTION_FAILED",
      status: 422,
      clientMessage: err.message,
      dbMessage: err.message,
    };
  }
  if (err instanceof LLMResponseParseError) {
    return {
      code: "LLM_RESPONSE_INVALID",
      status: 502,
      clientMessage: err.message,
      dbMessage: err.message,
    };
  }
  if (err instanceof LLMError) {
    return {
      code: "LLM_FAILED",
      status: 502,
      clientMessage: err.message,
      dbMessage: err.message,
    };
  }
  if (err instanceof PersistError) {
    return {
      code: "PERSIST_FAILED",
      status: 500,
      clientMessage: "Failed to save the generated content.",
      dbMessage: err.message,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    status: 500,
    clientMessage: "An unexpected error occurred while generating content.",
    dbMessage: err instanceof Error ? err.message : String(err),
  };
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return errorResponse(
      "UNAUTHORIZED",
      "Missing or invalid Authorization header",
      401,
    );
  }
  const jwt = authHeader.slice(7).trim();
  if (!jwt) {
    return errorResponse(
      "UNAUTHORIZED",
      "Missing or invalid Authorization header",
      401,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return errorResponse(
      "SERVER_MISCONFIGURED",
      "Server misconfiguration: Supabase env vars missing",
      500,
    );
  }

  // Client scoped to the caller's own JWT so every query is RLS-checked
  // as that user — never as service role.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return errorResponse("INVALID_TOKEN", "Invalid or expired token", 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse(
      "INVALID_JSON",
      "Request body must be valid JSON",
      400,
    );
  }

  let request: GenerationRequestBody;
  try {
    request = parseGenerationRequest(rawBody);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse("VALIDATION_ERROR", err.message, 400);
    }
    throw err;
  }

  // RLS-enforced ownership check: this SELECT only returns the project
  // if the current user is allowed to see it under the projects RLS
  // policy owned by feature/supabase-core.
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", request.project_id)
    .maybeSingle();

  if (projectError || !project) {
    return errorResponse(
      "PROJECT_NOT_FOUND",
      "Project not found or access denied",
      404,
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("generations")
    .insert({
      project_id: request.project_id,
      source_type: request.source_type,
      source_text: request.source_type === "text"
        ? request.source.trim()
        : null,
      source_url: request.source_type === "url" ? request.source.trim() : null,
      language: request.language,
      output_type: request.output_type,
      campaign_name: request.campaign_name ?? null,
      image_style: request.image_style ?? null,
      additional_instructions: request.additional_instructions || null,
      status: "processing",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return errorResponse(
      "GENERATION_CREATE_FAILED",
      "Failed to create generation record",
      500,
    );
  }

  const generationId = inserted.id as string;

  try {
    const rawText = request.source_type === "url"
      ? await extractTextFromUrl(request.source)
      : request.source;

    const preparedText = prepareTextForLLM(rawText);
    const prompt = buildGenerationPrompt(request, preparedText);

    const llmResult = await generateJson(prompt);

    const usage: UsageInfo = {
      llm_calls: 1,
      input_tokens: llmResult.inputTokens,
      output_tokens: llmResult.outputTokens,
      estimated_cost: calculateEstimatedCost(
        llmResult.inputTokens,
        llmResult.outputTokens,
        llmResult.model,
      ),
    };

    const socialPosts: SocialPosts = {
      telegram: llmResult.content.telegram,
      instagram: llmResult.content.instagram,
      linkedin: llmResult.content.linkedin,
    };

    const { error: updateError } = await supabase
      .from("generations")
      .update({
        status: "completed",
        title: llmResult.content.title,
        key_points: llmResult.content.key_points,
        social_posts: socialPosts,
        image_prompt: llmResult.content.image_prompt,
        llm_calls: usage.llm_calls,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        estimated_cost: usage.estimated_cost,
      })
      .eq("id", generationId);

    if (updateError) {
      throw new PersistError(
        `Failed to persist generation result: ${updateError.message}`,
      );
    }

    const response: GenerationResponseBody = {
      generation_id: generationId,
      status: "completed",
      title: llmResult.content.title,
      key_points: llmResult.content.key_points,
      social_posts: socialPosts,
      image_prompt: llmResult.content.image_prompt,
      usage,
    };

    return jsonResponse(response, 200);
  } catch (err) {
    const { code, status, clientMessage, dbMessage } = classifyPipelineError(
      err,
    );

    await supabase
      .from("generations")
      .update({ status: "failed", error_message: dbMessage })
      .eq("id", generationId);

    const failedResponse: GenerationResponseBody = {
      generation_id: generationId,
      status: "failed",
      error: { code, message: clientMessage },
      usage: {
        llm_calls: 0,
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost: 0,
      },
    };

    return jsonResponse(failedResponse, status);
  }
});
