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
import { bytesToBase64, generateBackground } from "../_shared/image-client.ts";
import { renderBrandedSvg, type BrandStyle } from "../_shared/visual-renderer.ts";

function safeErrorMessage(err: unknown): string {
  if (err instanceof ExtractionError || err instanceof LLMError || err instanceof LLMResponseParseError) {
    return err.message;
  }
  return "An unexpected error occurred while generating content.";
}

async function persistAsset(
  supabase: ReturnType<typeof createClient>, generationId: string, userId: string,
  assetType: "background" | "poster" | "banner", bytes: Uint8Array, mimeType: string,
  extension: "png" | "jpg" | "svg",
) {
  const path = `${userId}/${generationId}/${assetType}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("generated-assets").upload(path, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error(`Failed to upload ${assetType}: ${uploadError.message}`);
  const { data: asset, error: assetError } = await supabase.from("assets").insert({ generation_id: generationId, asset_type: assetType, format: extension, storage_path: path }).select("id").single();
  if (assetError || !asset) throw new Error(`Failed to save ${assetType}: ${assetError?.message || "unknown error"}`);
  const { data: signed, error: signedError } = await supabase.storage.from("generated-assets").createSignedUrl(path, 60 * 60);
  if (signedError || !signed) throw new Error(`Failed to sign ${assetType}: ${signedError?.message || "unknown error"}`);
  return { id: asset.id as string, asset_type: assetType, url: signed.signedUrl };
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse(req, { error: "Missing or invalid Authorization header" }, 401);
  }
  const jwt = authHeader.slice(7).trim();
  if (!jwt) {
    return jsonResponse(req, { error: "Missing or invalid Authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(req, { error: "Server misconfiguration: Supabase env vars missing" }, 500);
  }

  // Client scoped to the caller's own JWT so every query is RLS-checked
  // as that user — never as service role.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return jsonResponse(req, { error: "Invalid or expired token" }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse(req, { error: "Request body must be valid JSON" }, 400);
  }

  let request: GenerationRequestBody;
  try {
    request = parseGenerationRequest(rawBody);
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse(req, { error: err.message }, 400);
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
    return jsonResponse(req, { error: "Project not found or access denied" }, 404);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("generations")
    .insert({
      project_id: request.project_id,
      source_type: request.source_type,
      source_text: request.source_type === "text" ? request.source : null,
      source_url: request.source_type === "url" ? request.source : null,
      language: request.language,
      output_type: request.output_type,
      campaign_name: request.campaign_name ?? null,
      image_style: request.image_style ?? null,
      additional_instructions: request.additional_instructions ?? null,
      status: "processing",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return jsonResponse(req, { error: "Failed to create generation record" }, 500);
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
      llm_calls: 2,
      input_tokens: llmResult.inputTokens,
      output_tokens: llmResult.outputTokens,
      estimated_cost: calculateEstimatedCost(
        llmResult.inputTokens,
        llmResult.outputTokens,
        llmResult.model,
      ) + Number(Deno.env.get("IMAGE_COST_USD") || 0),
    };

    const socialPosts: SocialPosts = {
      telegram: llmResult.content.telegram,
      instagram: llmResult.content.instagram,
      linkedin: llmResult.content.linkedin,
    };

    // One Gemini image call per request: the background is reused to render all
    // requested formats, keeping token/credit usage predictable.
    const background = await generateBackground(llmResult.content.image_prompt);
    const { data: brandbook } = await supabase.from("brandbooks")
      .select("brand_name,light_logo_path,dark_logo_path,primary_color,text_color,overlay_color,overlay_opacity,heading_font")
      .eq("project_id", request.project_id).maybeSingle();
    let logoDataUri: string | undefined;
    const logoPath = brandbook?.light_logo_path || brandbook?.dark_logo_path;
    if (logoPath) {
      const { data: logo } = await supabase.storage.from("brand-assets").download(logoPath);
      if (logo) logoDataUri = `data:${logo.type || "image/png"};base64,${bytesToBase64(new Uint8Array(await logo.arrayBuffer()))}`;
    }
    const style: BrandStyle = {
      brandName: brandbook?.brand_name,
      primaryColor: brandbook?.primary_color || "#2563EB",
      textColor: brandbook?.text_color || "#FFFFFF",
      overlayColor: brandbook?.overlay_color || "#000000",
      overlayOpacity: Number(brandbook?.overlay_opacity ?? 0.4),
      headingFont: brandbook?.heading_font || "Inter",
      logoDataUri,
    };
    const extension = background.mimeType === "image/jpeg" ? "jpg" : "png";
    const assets = [await persistAsset(supabase, generationId, userData.user.id, "background", background.bytes, background.mimeType, extension)];
    if (request.output_type === "poster" || request.output_type === "media_pack") {
      assets.push(await persistAsset(supabase, generationId, userData.user.id, "poster", renderBrandedSvg(background.bytes, background.mimeType, llmResult.content.title, style, 1024, 1024), "image/svg+xml", "svg"));
    }
    if (request.output_type === "banner" || request.output_type === "media_pack") {
      assets.push(await persistAsset(supabase, generationId, userData.user.id, "banner", renderBrandedSvg(background.bytes, background.mimeType, llmResult.content.title, style, 1792, 1024), "image/svg+xml", "svg"));
    }

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
      assets,
      usage,
    };

    return jsonResponse(req, response, 200);
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

    return jsonResponse(req, failedResponse, 200);
  }
});
