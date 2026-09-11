import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  downloadGeneratedPng,
  GeneratedImageDownloadError,
  MAX_GENERATED_IMAGE_BYTES,
  readPngDimensions,
} from "./image-file.ts";

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

Deno.test("readPngDimensions reads IHDR dimensions", () => {
  assertEquals(readPngDimensions(pngHeader(1344, 768)), {
    width: 1344,
    height: 768,
  });
});

Deno.test("readPngDimensions rejects a non-PNG payload", () => {
  assertThrows(
    () => readPngDimensions(new TextEncoder().encode("not an image")),
    GeneratedImageDownloadError,
  );
});

Deno.test("downloadGeneratedPng validates and returns the image", async () => {
  const bytes = pngHeader(1024, 1024);
  const mockFetch = (() =>
    Promise.resolve(
      new Response(bytes.buffer as ArrayBuffer, {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    )) as typeof fetch;

  const result = await downloadGeneratedPng(
    "https://abc.replicate.delivery/image.png",
    mockFetch,
  );
  assertEquals(result.width, 1024);
  assertEquals(result.height, 1024);
  assertEquals(result.bytes, bytes);
});

Deno.test("downloadGeneratedPng rejects an untrusted URL before fetch", async () => {
  let called = false;
  const mockFetch = (() => {
    called = true;
    return Promise.resolve(new Response());
  }) as typeof fetch;

  await assertRejects(
    () => downloadGeneratedPng("https://example.com/image.png", mockFetch),
    GeneratedImageDownloadError,
  );
  assertEquals(called, false);
});

Deno.test("downloadGeneratedPng rejects declared oversized files", async () => {
  const bytes = pngHeader(1, 1);
  const mockFetch = (() =>
    Promise.resolve(
      new Response(bytes.buffer as ArrayBuffer, {
        headers: {
          "Content-Length": String(MAX_GENERATED_IMAGE_BYTES + 1),
        },
      }),
    )) as typeof fetch;

  await assertRejects(
    () =>
      downloadGeneratedPng(
        "https://replicate.delivery/too-large.png",
        mockFetch,
      ),
    GeneratedImageDownloadError,
    "25 MiB",
  );
});
