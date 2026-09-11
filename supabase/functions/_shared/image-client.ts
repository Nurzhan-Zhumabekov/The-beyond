const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

export class ImageGenerationError extends Error {}

export interface GeneratedImage {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
  model: string;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function generateBackground(prompt: string): Promise<GeneratedImage> {
  if (["1", "true", "yes"].includes((Deno.env.get("LLM_MOCK_MODE") || "").toLowerCase())) {
    return { bytes: decodeBase64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1aQAAAABJRU5ErkJggg=="), mimeType: "image/png", model: "mock-image" };
  }
  const key = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("IMAGE_MODEL") || DEFAULT_IMAGE_MODEL;
  if (!key) throw new ImageGenerationError("GEMINI_API_KEY is not configured");
  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
    }),
  });
  if (!response.ok) throw new ImageGenerationError(`Gemini image API returned ${response.status}`);
  const data = await response.json();
  const inlineData = data?.candidates?.[0]?.content?.parts?.find((part: { inlineData?: unknown }) => part.inlineData)?.inlineData;
  if (!inlineData?.data || !["image/png", "image/jpeg"].includes(inlineData.mimeType)) {
    throw new ImageGenerationError("Gemini image response did not contain a PNG or JPEG");
  }
  return { bytes: decodeBase64(inlineData.data), mimeType: inlineData.mimeType, model };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
