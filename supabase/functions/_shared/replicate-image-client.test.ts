import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  generateFluxImage,
  ImageProviderError,
  isTrustedReplicateOutputUrl,
} from "./replicate-image-client.ts";

async function withToken(
  value: string | undefined,
  fn: () => Promise<void>,
): Promise<void> {
  const previous = Deno.env.get("REPLICATE_API_TOKEN");
  try {
    if (value === undefined) Deno.env.delete("REPLICATE_API_TOKEN");
    else Deno.env.set("REPLICATE_API_TOKEN", value);
    await fn();
  } finally {
    if (previous === undefined) Deno.env.delete("REPLICATE_API_TOKEN");
    else Deno.env.set("REPLICATE_API_TOKEN", previous);
  }
}

Deno.test("generateFluxImage calls FLUX Schnell with safe defaults", async () => {
  await withToken("test-token", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const mockFetch = ((url: string | URL | Request, init?: RequestInit) => {
      requestUrl = String(url);
      requestInit = init;
      return Promise.resolve(Response.json({
        id: "prediction-1",
        status: "succeeded",
        output: ["https://pbxt.replicate.delivery/image.png"],
      }));
    }) as typeof fetch;

    const result = await generateFluxImage(
      "A futuristic city, no text",
      { aspectRatio: "16:9", seed: 42 },
      mockFetch,
    );

    assertEquals(
      requestUrl,
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    );
    assertEquals(result.predictionId, "prediction-1");
    assertEquals(result.outputUrl, "https://pbxt.replicate.delivery/image.png");

    const headers = new Headers(requestInit?.headers);
    assertEquals(headers.get("Authorization"), "Bearer test-token");
    assertEquals(headers.get("Prefer"), "wait=60");
    assertEquals(headers.get("Cancel-After"), "90s");

    const body = JSON.parse(String(requestInit?.body));
    assertEquals(body.input.aspect_ratio, "16:9");
    assertEquals(body.input.output_format, "png");
    assertEquals(body.input.num_inference_steps, 4);
    assertEquals(body.input.seed, 42);
  });
});

Deno.test("generateFluxImage accepts a ready file while status is processing", async () => {
  await withToken("test-token", async () => {
    const mockFetch = (() =>
      Promise.resolve(Response.json({
        id: "prediction-2",
        status: "processing",
        output: "https://replicate.delivery/image.png",
      }))) as typeof fetch;

    const result = await generateFluxImage(
      "Prompt",
      { aspectRatio: "1:1" },
      mockFetch,
    );
    assertEquals(result.predictionId, "prediction-2");
  });
});

Deno.test("generateFluxImage polls an incomplete prediction", async () => {
  await withToken("test-token", async () => {
    let calls = 0;
    const mockFetch = (() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve(Response.json({
          id: "prediction-3",
          status: "starting",
          output: null,
          urls: {
            get: "https://api.replicate.com/v1/predictions/prediction-3",
          },
        }));
      }
      return Promise.resolve(Response.json({
        id: "prediction-3",
        status: "succeeded",
        output: ["https://abc.replicate.delivery/final.png"],
      }));
    }) as typeof fetch;

    const result = await generateFluxImage(
      "Prompt",
      { aspectRatio: "1:1" },
      mockFetch,
      () => Promise.resolve(),
    );
    assertEquals(calls, 2);
    assertEquals(result.outputUrl, "https://abc.replicate.delivery/final.png");
  });
});

Deno.test("generateFluxImage rejects an untrusted polling URL", async () => {
  await withToken("test-token", async () => {
    const mockFetch = (() =>
      Promise.resolve(Response.json({
        id: "prediction-4",
        status: "starting",
        urls: { get: "https://example.com/steal-token" },
      }))) as typeof fetch;

    await assertRejects(
      () =>
        generateFluxImage(
          "Prompt",
          { aspectRatio: "1:1" },
          mockFetch,
          () => Promise.resolve(),
        ),
      ImageProviderError,
      "valid status URL",
    );
  });
});

Deno.test("generateFluxImage maps provider rate limits to HTTP 429", async () => {
  await withToken("test-token", async () => {
    const mockFetch = (() =>
      Promise.resolve(
        Response.json({ detail: "slow down" }, { status: 429 }),
      )) as typeof fetch;

    const error = await assertRejects(
      () => generateFluxImage("Prompt", { aspectRatio: "1:1" }, mockFetch),
      ImageProviderError,
    );
    assertEquals(error.code, "IMAGE_PROVIDER_RATE_LIMITED");
    assertEquals(error.httpStatus, 429);
  });
});

Deno.test("generateFluxImage fails safely without a token", async () => {
  await withToken(undefined, async () => {
    const error = await assertRejects(
      () => generateFluxImage("Prompt", { aspectRatio: "1:1" }),
      ImageProviderError,
    );
    assertEquals(error.code, "IMAGE_PROVIDER_NOT_CONFIGURED");
    assertEquals(error.httpStatus, 500);
  });
});

Deno.test("only Replicate delivery HTTPS URLs are accepted", () => {
  assert(isTrustedReplicateOutputUrl("https://replicate.delivery/a.png"));
  assert(isTrustedReplicateOutputUrl("https://abc.replicate.delivery/a.png"));
  assert(!isTrustedReplicateOutputUrl("http://replicate.delivery/a.png"));
  assert(!isTrustedReplicateOutputUrl("https://replicate.delivery.example/a"));
  assert(!isTrustedReplicateOutputUrl("https://example.com/a.png"));
});
