/**
 * Fetches a URL and extracts readable article text from its HTML.
 *
 * Deliberately simple: a plain `fetch` GET followed by regex-based
 * HTML-to-text extraction. No headless browsers, no anti-bot bypassing.
 * Sites that require JS rendering or block simple requests are expected
 * to fail with a clear ExtractionError.
 */

export class ExtractionError extends Error {}

const REQUEST_TIMEOUT_MS = 10_000;
const MIN_EXTRACTED_TEXT_LENGTH = 200;
const USER_AGENT = "AIContentFactory/0.1 (+edge-function-content-extraction)";

export function validateUrl(url: string): void {
  if (!url || !url.trim()) {
    throw new ExtractionError("URL must not be empty");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ExtractionError("URL must be an absolute http or https address");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new ExtractionError("URL must be an absolute http or https address");
  }
  if (parsed.username || parsed.password) {
    throw new ExtractionError("URL must not include credentials");
  }
  const hostname = parsed.hostname.toLowerCase();
  const privateIpv4 = /^(127|10)\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./;
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.startsWith("fe80:") ||
    privateIpv4.test(hostname)
  ) {
    throw new ExtractionError("URL must not target a private or local address");
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

/** Pure HTML -> readable text extraction, safe to unit test with mock HTML. */
export function extractReadableText(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const titleMatch = withoutNoise.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).trim() : "";

  const articleMatch = withoutNoise.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = withoutNoise.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = withoutNoise.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  const contentHtml = articleMatch?.[1] ?? mainMatch?.[1] ?? bodyMatch?.[1] ?? withoutNoise;
  const bodyText = stripTags(contentHtml).trim();

  const combined = title ? `${title}\n\n${bodyText}` : bodyText;
  return normalizeWhitespace(combined);
}

/**
 * Fetches the URL and returns extracted readable text.
 * `fetchImpl` can be overridden in tests to avoid real network calls.
 */
export async function extractTextFromUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  validateUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let html: string;
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      throw new ExtractionError(
        `URL returned an error status (${response.status}): ${url}`,
      );
    }
    html = await response.text();
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ExtractionError(`Timed out while fetching URL: ${url}`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new ExtractionError(`Failed to fetch URL: ${url} (${message})`);
  } finally {
    clearTimeout(timeoutId);
  }

  const text = extractReadableText(html);
  if (text.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new ExtractionError(
      "The article at this URL is unavailable or contains too little text to process.",
    );
  }

  return text;
}
