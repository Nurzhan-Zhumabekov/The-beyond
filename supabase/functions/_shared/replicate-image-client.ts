export type FluxAspectRatio = "1:1" | "16:9";

export interface FluxImageOptions {
  aspectRatio: FluxAspectRatio;
  seed?: number;
}

export interface FluxImageResult {
  predictionId: string;
  outputUrl: string;
}

export class ImageProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}

interface ReplicatePrediction {
  id?: unknown;
  status?: unknown;
  output?: unknown;
  error?: unknown;
  urls?: { get?: unknown };
}

type Sleep = (milliseconds: number) => Promise<void>;

const CREATE_PREDICTION_URL =
  "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";
const TERMINAL_SUCCESS = new Set(["succeeded", "successful"]);
const TERMINAL_FAILURE = new Set([
  "failed",
  "canceled",
  "cancelled",
  "aborted",
]);

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function trustedReplicateApiUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" &&
      url.hostname === "api.replicate.com" &&
      /^\/v1\/predictions\/[A-Za-z0-9_-]+$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function isTrustedReplicateOutputUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" &&
      (url.hostname === "replicate.delivery" ||
        url.hostname.endsWith(".replicate.delivery"));
  } catch {
    return false;
  }
}

function outputUrlFrom(prediction: ReplicatePrediction): string | null {
  const value = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;
  if (typeof value !== "string" || !isTrustedReplicateOutputUrl(value)) {
    return null;
  }
  return value;
}

async function parsePrediction(
  response: Response,
): Promise<ReplicatePrediction> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ImageProviderError(
      "IMAGE_PROVIDER_INVALID_RESPONSE",
      "Image provider returned an invalid response.",
      502,
    );
  }

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    throw new ImageProviderError(
      response.status === 429
        ? "IMAGE_PROVIDER_RATE_LIMITED"
        : "IMAGE_PROVIDER_FAILED",
      response.status === 429
        ? "Image provider rate limit reached. Try again shortly."
        : "Image provider rejected the generation request.",
      status,
    );
  }

  if (
    typeof payload !== "object" || payload === null || Array.isArray(payload)
  ) {
    throw new ImageProviderError(
      "IMAGE_PROVIDER_INVALID_RESPONSE",
      "Image provider returned an invalid response.",
      502,
    );
  }
  return payload as ReplicatePrediction;
}

function completedResult(
  prediction: ReplicatePrediction,
): FluxImageResult | null {
  const outputUrl = outputUrlFrom(prediction);
  if (!outputUrl) return null;

  return {
    predictionId: typeof prediction.id === "string" ? prediction.id : "unknown",
    outputUrl,
  };
}

function assertNotFailed(prediction: ReplicatePrediction): void {
  const status = typeof prediction.status === "string"
    ? prediction.status.toLowerCase()
    : "";
  if (TERMINAL_FAILURE.has(status)) {
    throw new ImageProviderError(
      "IMAGE_GENERATION_FAILED",
      "The image provider could not generate this image.",
      502,
    );
  }
  if (TERMINAL_SUCCESS.has(status) && !outputUrlFrom(prediction)) {
    throw new ImageProviderError(
      "IMAGE_PROVIDER_INVALID_RESPONSE",
      "Image provider completed without a usable image.",
      502,
    );
  }
}

async function requestPrediction(
  url: string,
  token: string,
  fetchImpl: typeof fetch,
  init?: RequestInit,
): Promise<ReplicatePrediction> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(70_000),
    });
  } catch {
    throw new ImageProviderError(
      "IMAGE_PROVIDER_UNAVAILABLE",
      "Image provider is temporarily unavailable.",
      502,
    );
  }
  return await parsePrediction(response);
}

/** Runs the official black-forest-labs/flux-schnell model on Replicate. */
export async function generateFluxImage(
  prompt: string,
  options: FluxImageOptions,
  fetchImpl: typeof fetch = fetch,
  sleep: Sleep = delay,
): Promise<FluxImageResult> {
  const token = Deno.env.get("REPLICATE_API_TOKEN")?.trim();
  if (!token) {
    throw new ImageProviderError(
      "IMAGE_PROVIDER_NOT_CONFIGURED",
      "Image provider is not configured.",
      500,
    );
  }
  if (!prompt.trim()) {
    throw new ImageProviderError(
      "IMAGE_PROMPT_MISSING",
      "Image prompt is empty.",
      409,
    );
  }

  const input: Record<string, unknown> = {
    prompt: prompt.trim(),
    aspect_ratio: options.aspectRatio,
    num_outputs: 1,
    num_inference_steps: 4,
    go_fast: true,
    output_format: "png",
    disable_safety_checker: false,
  };
  if (options.seed !== undefined) input.seed = options.seed;

  let prediction = await requestPrediction(
    CREATE_PREDICTION_URL,
    token,
    fetchImpl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "wait=60",
        "Cancel-After": "90s",
      },
      body: JSON.stringify({ input }),
    },
  );

  const immediate = completedResult(prediction);
  if (immediate) return immediate;
  assertNotFailed(prediction);

  for (let attempt = 0; attempt < 6; attempt++) {
    const getUrl = prediction.urls?.get;
    if (typeof getUrl !== "string" || !trustedReplicateApiUrl(getUrl)) {
      throw new ImageProviderError(
        "IMAGE_PROVIDER_INVALID_RESPONSE",
        "Image provider did not return a valid status URL.",
        502,
      );
    }

    await sleep(1_000);
    prediction = await requestPrediction(getUrl, token, fetchImpl);
    const completed = completedResult(prediction);
    if (completed) return completed;
    assertNotFailed(prediction);
  }

  throw new ImageProviderError(
    "IMAGE_GENERATION_TIMEOUT",
    "Image generation timed out. Please try again.",
    504,
  );
}
