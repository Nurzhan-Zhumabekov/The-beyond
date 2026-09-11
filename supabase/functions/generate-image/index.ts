/**
 * POST /functions/v1/generate-image
 *
 * Generates a text-free base image with FLUX.1 Schnell for an existing,
 * completed generation. The caller's JWT scopes every database and Storage
 * operation through RLS; the Replicate token remains server-side only.
 */

import { createClient } from "@supabase/supabase-js";
import { errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  type ImageGenerationRequest,
  ImageRequestValidationError,
  parseImageGenerationRequest,
} from "../_shared/visual-types.ts";
import {
  type FluxAspectRatio,
  generateFluxImage,
  ImageProviderError,
} from "../_shared/replicate-image-client.ts";
import {
  downloadGeneratedPng,
  GeneratedImageDownloadError,
} from "../_shared/image-file.ts";

const GENERATED_ASSETS_BUCKET = "generated-assets";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

class VisualEngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function aspectRatioFor(outputType: string): FluxAspectRatio {
  return outputType === "poster" ? "1:1" : "16:9";
}

function compositionInstruction(aspectRatio: FluxAspectRatio): string {
  return aspectRatio === "1:1"
    ? "Square composition, important subjects near the center, leave clean space for a headline and logo."
    : "Wide cinematic composition, important subjects near the center, leave clean space for a headline and logo.";
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

  let request: ImageGenerationRequest;
  try {
    request = parseImageGenerationRequest(rawBody);
  } catch (error) {
    if (error instanceof ImageRequestValidationError) {
      return errorResponse("VALIDATION_ERROR", error.message, 400);
    }
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }

  try {
    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("id, project_id, status, output_type, image_prompt")
      .eq("id", request.generation_id)
      .maybeSingle();

    if (generationError) {
      throw new VisualEngineError(
        "GENERATION_READ_FAILED",
        "Failed to read generation data.",
        500,
      );
    }
    if (!generation) {
      throw new VisualEngineError(
        "GENERATION_NOT_FOUND",
        "Generation not found or access denied.",
        404,
      );
    }
    if (
      generation.status !== "completed" ||
      typeof generation.image_prompt !== "string" ||
      !generation.image_prompt.trim()
    ) {
      throw new VisualEngineError(
        "GENERATION_NOT_READY",
        "Text generation must complete before creating an image.",
        409,
      );
    }

    const { data: existingAsset, error: existingError } = await supabase
      .from("assets")
      .select("id, storage_path, format, width, height, version")
      .eq("generation_id", generation.id)
      .eq("asset_type", "background")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new VisualEngineError(
        "ASSET_READ_FAILED",
        "Failed to read generated assets.",
        500,
      );
    }

    if (existingAsset && !request.force) {
      const { data: signed, error: signedError } = await supabase.storage
        .from(GENERATED_ASSETS_BUCKET)
        .createSignedUrl(existingAsset.storage_path, SIGNED_URL_TTL_SECONDS);
      if (signedError || !signed?.signedUrl) {
        throw new VisualEngineError(
          "SIGNED_URL_FAILED",
          "Failed to create a download URL for the generated image.",
          500,
        );
      }

      return jsonResponse({
        generation_id: generation.id,
        asset: {
          ...existingAsset,
          asset_type: "background",
          signed_url: signed.signedUrl,
          signed_url_expires_in: SIGNED_URL_TTL_SECONDS,
        },
        reused: true,
      }, 200);
    }

    const aspectRatio = aspectRatioFor(generation.output_type);
    const prompt = [
      generation.image_prompt.trim(),
      compositionInstruction(aspectRatio),
      "No text, no letters, no words, no logo, no watermark.",
    ].join(" ");
    const providerResult = await generateFluxImage(prompt, {
      aspectRatio,
      seed: request.seed,
    });
    const image = await downloadGeneratedPng(providerResult.outputUrl);

    const version = existingAsset ? Number(existingAsset.version) + 1 : 1;
    const storagePath = [
      userData.user.id,
      generation.project_id,
      "generations",
      generation.id,
      `background-v${version}-${crypto.randomUUID()}.png`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(GENERATED_ASSETS_BUCKET)
      .upload(storagePath, image.bytes, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) {
      throw new VisualEngineError(
        "ASSET_UPLOAD_FAILED",
        "Failed to store the generated image.",
        500,
      );
    }

    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        generation_id: generation.id,
        parent_asset_id: null,
        asset_type: "background",
        format: "png",
        storage_path: storagePath,
        width: image.width,
        height: image.height,
        version,
      })
      .select("id, storage_path, format, width, height, version")
      .single();

    if (assetError || !asset) {
      await supabase.storage
        .from(GENERATED_ASSETS_BUCKET)
        .remove([storagePath]);
      throw new VisualEngineError(
        "ASSET_CREATE_FAILED",
        "Failed to save generated image metadata.",
        500,
      );
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(GENERATED_ASSETS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (signedError || !signed?.signedUrl) {
      throw new VisualEngineError(
        "SIGNED_URL_FAILED",
        "Image was saved, but its download URL could not be created.",
        500,
      );
    }

    return jsonResponse({
      generation_id: generation.id,
      prediction_id: providerResult.predictionId,
      asset: {
        ...asset,
        asset_type: "background",
        signed_url: signed.signedUrl,
        signed_url_expires_in: SIGNED_URL_TTL_SECONDS,
      },
      reused: false,
    }, 201);
  } catch (error) {
    if (error instanceof ImageProviderError) {
      return errorResponse(error.code, error.message, error.httpStatus);
    }
    if (error instanceof GeneratedImageDownloadError) {
      return errorResponse("IMAGE_DOWNLOAD_FAILED", error.message, 502);
    }
    if (error instanceof VisualEngineError) {
      return errorResponse(error.code, error.message, error.status);
    }
    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred while generating the image.",
      500,
    );
  }
});
