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
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  parseGenerationRequest,
  ValidationError,
  type GenerationRequestBody,
  type GenerationResponseBody,
  type SocialPosts,
  type UsageInfo,
} from "../_shared/types.ts";
import { prepareTextForLLM } from "../_shared/content.ts";
import { extractTextFromUrl, ExtractionError } from "../_shared/url-extractor.ts";
import { buildGenerationPrompt } from "../_shared/prompt-builder.ts";
import { generateJson, LLMError } from "../_shared/llm-client.ts";
import { LLMResponseParseError } from "../_shared/json-parser.ts";
import { calculateEstimatedCost } from "../_shared/cost-calculator.ts";

function safeErrorMessage(err: unknown): string {
  if (err instanceof ExtractionError || err instanceof LLMError || err instanceof LLMResponseParseError) {
    return err.message;
  }
  return "An unexpected error occurred while generating content.";
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
  }
  const jwt = authHeader.slice(7).trim();
  if (!jwt) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Server misconfiguration: Supabase env vars missing" }, 500);
  }

  // Client scoped to the caller's own JWT so every query is RLS-checked
  // as that user — never as service role.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON" }, 400);
  }

  let request: GenerationRequestBody;
  try {
    request = parseGenerationRequest(rawBody);
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse({ error: err.message }, 400);
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
    return jsonResponse({ error: "Project not found or access denied" }, 404);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("generations")
    .insert({
      project_id: request.project_id,
      source_type: request.source_type,
      source_text:
        request.source_type === "text"
          ? request.source.trim()
          : null,
      source_url:
        request.source_type === "url"
          ? request.source.trim()
          : null,
      language: request.language,
      output_type: request.output_type,
      campaign_name: request.campaign_name ?? null,
      image_style: request.image_style ?? null,
      additional_instructions:
        request.additional_instructions || null,
      status: "processing",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return jsonResponse({ error: "Failed to create generation record" }, 500);
  }

  const generationId = inserted.id as string;

  try {
    const rawText =
      request.source_type === "url"
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
      throw new Error(`Failed to persist generation result: ${updateError.message}`);
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
    const message = safeErrorMessage(err);

    await supabase
      .from("generations")
      .update({ status: "failed", error_message: message })
      .eq("id", generationId);

    const failedResponse: GenerationResponseBody = {
      generation_id: generationId,
      status: "failed",
      error: message,
      usage: { llm_calls: 0, input_tokens: 0, output_tokens: 0, estimated_cost: 0 },
    };

    return jsonResponse(failedResponse, 200);
  }
});
