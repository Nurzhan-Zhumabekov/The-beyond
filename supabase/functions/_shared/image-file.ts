import { isTrustedReplicateOutputUrl } from "./replicate-image-client.ts";

export const MAX_GENERATED_IMAGE_BYTES = 25 * 1024 * 1024;

export interface DownloadedPng {
  bytes: Uint8Array;
  width: number;
  height: number;
}

export class GeneratedImageDownloadError extends Error {}

export function readPngDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 24 ||
    !signature.every((value, index) => bytes[index] === value) ||
    new TextDecoder().decode(bytes.slice(12, 16)) !== "IHDR"
  ) {
    throw new GeneratedImageDownloadError(
      "Image provider did not return a valid PNG file.",
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) {
    throw new GeneratedImageDownloadError(
      "Image provider returned a PNG with invalid dimensions.",
    );
  }
  return { width, height };
}

export async function downloadGeneratedPng(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DownloadedPng> {
  if (!isTrustedReplicateOutputUrl(url)) {
    throw new GeneratedImageDownloadError(
      "Image provider returned an untrusted file URL.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: "image/png" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new GeneratedImageDownloadError(
      "Generated image could not be downloaded.",
    );
  }
  if (!response.ok) {
    throw new GeneratedImageDownloadError(
      "Generated image could not be downloaded.",
    );
  }

  const declaredLength = Number(response.headers.get("Content-Length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_GENERATED_IMAGE_BYTES
  ) {
    throw new GeneratedImageDownloadError(
      "Generated image exceeds the 25 MiB storage limit.",
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_GENERATED_IMAGE_BYTES) {
    throw new GeneratedImageDownloadError(
      "Generated image exceeds the 25 MiB storage limit.",
    );
  }
  const { width, height } = readPngDimensions(bytes);
  return { bytes, width, height };
}
