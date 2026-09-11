/**
 * Fetches a URL and extracts readable article text from its HTML.
 *
 * Deliberately simple: a plain `fetch` GET followed by regex-based
 * HTML-to-text extraction. No headless browsers, no anti-bot bypassing.
 * Sites that require JS rendering or block simple requests are expected
 * to fail with a clear ExtractionError.
 *
 * SSRF hardening: this module refuses to fetch anything that resolves
 * to a non-public address (loopback/private/link-local/multicast/
 * unspecified, on both IPv4 and IPv6, including cloud metadata
 * endpoints like 169.254.169.254). Redirects are followed manually so
 * every hop is re-validated the same way — a URL cannot start public
 * and redirect its way into the private network.
 *
 * Known limitation: hostnames are validated via a DNS lookup *before*
 * the actual fetch. This does not fully close a DNS-rebinding attack
 * (where the name resolves differently a few milliseconds later, at
 * connection time) — closing that gap requires pinning the validated
 * IP for the actual TCP connection, which `fetch()` does not expose.
 * That is a further hardening step beyond the scope of this fix.
 */

export class ExtractionError extends Error {}

const REQUEST_TIMEOUT_MS = 10_000;
const MIN_EXTRACTED_TEXT_LENGTH = 200;
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MiB
const USER_AGENT = "AIContentFactory/0.1 (+edge-function-content-extraction)";
const ALLOWED_CONTENT_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "text/plain",
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

type ResolveDns = typeof Deno.resolveDns;

// ---------------------------------------------------------------------------
// IP address classification (SSRF guards)
// ---------------------------------------------------------------------------

function isIPv4Literal(host: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

function isIPv6Literal(host: string): boolean {
  return host.includes(":");
}

function stripBrackets(host: string): string {
  if (host.startsWith("[") && host.endsWith("]")) {
    return host.slice(1, -1);
  }
  return host;
}

/** True only for globally routable IPv4 addresses. */
export function isPublicIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return false;
  }
  const [a, b, c] = parts;

  if (a === 0) return false; // 0.0.0.0/8 "this network" / unspecified
  if (a === 10) return false; // 10.0.0.0/8 private
  if (a === 127) return false; // 127.0.0.0/8 loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return false; // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return false; // 192.168.0.0/16 private
  if (a === 192 && b === 0 && c === 0) return false; // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return false; // 192.0.2.0/24 TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return false; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved/broadcast

  return true;
}

/** True only for globally routable IPv6 addresses. */
export function isPublicIPv6(rawIp: string): boolean {
  const ip = rawIp.toLowerCase();

  if (ip === "::" || ip === "::0") return false; // unspecified
  if (ip === "::1") return false; // loopback

  const mapped = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPublicIPv4(mapped[1]); // IPv4-mapped IPv6, check the embedded address

  if (/^fe[89ab][0-9a-f]:/.test(ip)) return false; // fe80::/10 link-local
  if (/^f[cd][0-9a-f]{2}:/.test(ip)) return false; // fc00::/7 unique local
  if (ip.startsWith("ff")) return false; // ff00::/8 multicast

  return true;
}

function isPublicAddress(address: string): boolean {
  return isIPv4Literal(address) ? isPublicIPv4(address) : isPublicIPv6(address);
}

/**
 * Rejects hostnames that are, or resolve to, a non-public address.
 * Exported for direct unit testing with an injected DNS resolver.
 */
export async function assertPublicHost(
  hostname: string,
  resolveDnsImpl: ResolveDns = Deno.resolveDns,
): Promise<void> {
  const normalized = stripBrackets(hostname).toLowerCase().replace(/\.$/, "");

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    throw new ExtractionError(
      `Requests to localhost are not allowed: ${hostname}`,
    );
  }

  if (isIPv4Literal(normalized)) {
    if (!isPublicIPv4(normalized)) {
      throw new ExtractionError(
        `Requests to private/internal IP addresses are not allowed: ${hostname}`,
      );
    }
    return;
  }

  if (isIPv6Literal(normalized)) {
    if (!isPublicIPv6(normalized)) {
      throw new ExtractionError(
        `Requests to private/internal IP addresses are not allowed: ${hostname}`,
      );
    }
    return;
  }

  const addresses: string[] = [];
  for (const recordType of ["A", "AAAA"] as const) {
    try {
      const records = await resolveDnsImpl(normalized, recordType);
      addresses.push(...(records as string[]));
    } catch {
      // No records of this type (or NXDOMAIN) — checked via the other type / final count below.
    }
  }

  if (addresses.length === 0) {
    throw new ExtractionError(`Could not resolve hostname: ${hostname}`);
  }

  for (const address of addresses) {
    if (!isPublicAddress(address)) {
      throw new ExtractionError(
        `Hostname resolves to a private/internal IP address and cannot be fetched: ${hostname}`,
      );
    }
  }
}

/**
 * Parses and fully validates a URL: scheme, and hostname/DNS-resolved
 * addresses must all be public. Throws ExtractionError otherwise.
 */
export async function assertSafeUrl(
  rawUrl: string,
  resolveDnsImpl: ResolveDns = Deno.resolveDns,
): Promise<URL> {
  if (!rawUrl || !rawUrl.trim()) {
    throw new ExtractionError("URL must not be empty");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ExtractionError(`URL is malformed: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ExtractionError(
      `URL must use http:// or https://, got: ${parsed.protocol}`,
    );
  }

  await assertPublicHost(parsed.hostname, resolveDnsImpl);

  return parsed;
}

// ---------------------------------------------------------------------------
// HTML -> text extraction
// ---------------------------------------------------------------------------

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

  const articleMatch = withoutNoise.match(
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  );
  const mainMatch = withoutNoise.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = withoutNoise.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  const contentHtml = articleMatch?.[1] ?? mainMatch?.[1] ?? bodyMatch?.[1] ??
    withoutNoise;
  const bodyText = stripTags(contentHtml).trim();

  const combined = title ? `${title}\n\n${bodyText}` : bodyText;
  return normalizeWhitespace(combined);
}

// ---------------------------------------------------------------------------
// Bounded body reading
// ---------------------------------------------------------------------------

/** Reads at most `maxBytes` of the response body, never calling the unbounded `response.text()`. */
async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const body = response.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      const remaining = maxBytes - totalBytes;
      if (remaining <= 0) break;

      if (value.byteLength > remaining) {
        chunks.push(value.subarray(0, remaining));
        totalBytes += remaining;
        break;
      }

      chunks.push(value);
      totalBytes += value.byteLength;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Body already fully consumed/closed — nothing to cancel.
    }
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(combined);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Fetches the URL (following at most MAX_REDIRECTS manually-validated
 * redirects) and returns extracted readable text.
 *
 * `fetchImpl`/`resolveDnsImpl` can be overridden in tests to avoid real
 * network/DNS calls.
 */
export async function extractTextFromUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
  resolveDnsImpl: ResolveDns = Deno.resolveDns,
): Promise<string> {
  let currentUrl = url;
  let redirectsFollowed = 0;
  let html = "";

  while (true) {
    const parsed = await assertSafeUrl(currentUrl, resolveDnsImpl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetchImpl(parsed.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ExtractionError(
          `Timed out while fetching URL: ${currentUrl}`,
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new ExtractionError(
        `Failed to fetch URL: ${currentUrl} (${message})`,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      if (redirectsFollowed >= MAX_REDIRECTS) {
        throw new ExtractionError(
          `Too many redirects (max ${MAX_REDIRECTS}) while fetching URL: ${url}`,
        );
      }
      const location = response.headers.get("location");
      if (!location) {
        throw new ExtractionError(
          `Redirect response missing a Location header: ${currentUrl}`,
        );
      }
      currentUrl = new URL(location, parsed).toString();
      redirectsFollowed++;
      continue;
    }

    if (!response.ok) {
      throw new ExtractionError(
        `URL returned an error status (${response.status}): ${currentUrl}`,
      );
    }

    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new ExtractionError(
        `Unsupported content type for extraction: ${contentType || "unknown"}`,
      );
    }

    html = await readBodyWithLimit(response, MAX_RESPONSE_BYTES);
    break;
  }

  const text = extractReadableText(html);
  if (text.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new ExtractionError(
      "The article at this URL is unavailable or contains too little text to process.",
    );
  }

  return text;
}
