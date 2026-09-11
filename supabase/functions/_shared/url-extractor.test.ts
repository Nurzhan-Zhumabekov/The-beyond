import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  assertPublicHost,
  assertSafeUrl,
  ExtractionError,
  extractReadableText,
  extractTextFromUrl,
  isPublicIPv4,
  isPublicIPv6,
} from "./url-extractor.ts";

const SAMPLE_HTML = `
<html>
<head><title>The Future of AI Content</title></head>
<body>
<nav>Menu</nav>
<article>
<p>Artificial intelligence is rapidly changing the content industry.</p>
<p>Companies are adopting automated text and image generation to speed up
marketing production and reduce costs. Experts note that in the coming
years such tools will become standard for teams of any size working with
content and advertising. This paragraph is padded to make sure the
extracted text passes the minimum length threshold used by the pipeline
so the test reliably exercises the success path end to end.</p>
</article>
<script>console.log('should be removed');</script>
<style>.a { color: red; }</style>
</body>
</html>
`;

// A stable, well-known public IP (example.com) — used to exercise the
// fetch/extraction pipeline without needing a DNS mock.
const PUBLIC_IP = "93.184.216.34";

type DnsMap = Record<string, { a?: string[]; aaaa?: string[] }>;

function makeDnsMock(map: DnsMap): typeof Deno.resolveDns {
  return (((query: string, recordType: "A" | "AAAA") => {
    const entry = map[query.toLowerCase()];
    const list = entry
      ? (recordType === "A" ? entry.a : entry.aaaa)
      : undefined;
    if (!list || list.length === 0) {
      return Promise.reject(
        new Error(`no mock ${recordType} record for ${query}`),
      );
    }
    return Promise.resolve(list);
  }) as unknown) as typeof Deno.resolveDns;
}

function htmlResponse(
  body: BodyInit | null,
  status = 200,
  contentType = "text/html",
) {
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
}

// ---------------------------------------------------------------------------
// Pure IP range classification
// ---------------------------------------------------------------------------

Deno.test("isPublicIPv4 rejects loopback", () => {
  assert(!isPublicIPv4("127.0.0.1"));
});

Deno.test("isPublicIPv4 rejects 10.0.0.0/8", () => {
  assert(!isPublicIPv4("10.0.0.5"));
  assert(!isPublicIPv4("10.255.255.255"));
});

Deno.test("isPublicIPv4 rejects 172.16.0.0/12", () => {
  assert(!isPublicIPv4("172.16.0.1"));
  assert(!isPublicIPv4("172.31.255.255"));
  assert(isPublicIPv4("172.32.0.1")); // just outside the private range
});

Deno.test("isPublicIPv4 rejects 192.168.0.0/16", () => {
  assert(!isPublicIPv4("192.168.1.1"));
});

Deno.test("isPublicIPv4 rejects 169.254.0.0/16 (incl. cloud metadata)", () => {
  assert(!isPublicIPv4("169.254.1.1"));
  assert(!isPublicIPv4("169.254.169.254"));
});

Deno.test("isPublicIPv4 rejects unspecified/multicast/reserved", () => {
  assert(!isPublicIPv4("0.0.0.0"));
  assert(!isPublicIPv4("224.0.0.1"));
  assert(!isPublicIPv4("255.255.255.255"));
});

Deno.test("isPublicIPv4 accepts an ordinary public address", () => {
  assert(isPublicIPv4("8.8.8.8"));
  assert(isPublicIPv4(PUBLIC_IP));
});

Deno.test("isPublicIPv6 rejects loopback and unspecified", () => {
  assert(!isPublicIPv6("::1"));
  assert(!isPublicIPv6("::"));
});

Deno.test("isPublicIPv6 rejects link-local, unique-local and multicast", () => {
  assert(!isPublicIPv6("fe80::1"));
  assert(!isPublicIPv6("fc00::1"));
  assert(!isPublicIPv6("fd12:3456:789a::1"));
  assert(!isPublicIPv6("ff02::1"));
});

Deno.test("isPublicIPv6 rejects an IPv4-mapped private address", () => {
  assert(!isPublicIPv6("::ffff:127.0.0.1"));
  assert(!isPublicIPv6("::ffff:10.0.0.5"));
});

Deno.test("isPublicIPv6 accepts an ordinary public address", () => {
  assert(isPublicIPv6("2001:4860:4860::8888"));
});

// ---------------------------------------------------------------------------
// Hostname / SSRF guards
// ---------------------------------------------------------------------------

Deno.test("assertPublicHost rejects 'localhost' and '*.localhost'", async () => {
  await assertRejects(() => assertPublicHost("localhost"), ExtractionError);
  await assertRejects(() => assertPublicHost("api.localhost"), ExtractionError);
});

Deno.test("assertPublicHost rejects literal private/loopback IPs without a DNS lookup", async () => {
  await assertRejects(() => assertPublicHost("127.0.0.1"), ExtractionError);
  await assertRejects(() => assertPublicHost("::1"), ExtractionError);
  await assertRejects(() => assertPublicHost("10.0.0.5"), ExtractionError);
  await assertRejects(() => assertPublicHost("172.16.5.5"), ExtractionError);
  await assertRejects(() => assertPublicHost("192.168.0.1"), ExtractionError);
  await assertRejects(
    () => assertPublicHost("169.254.169.254"),
    ExtractionError,
  );
});

Deno.test("assertPublicHost accepts a domain that resolves to a public address", async () => {
  const dns = makeDnsMock({ "example.com": { a: [PUBLIC_IP] } });
  await assertPublicHost("example.com", dns);
});

Deno.test("assertPublicHost rejects a domain that resolves to a private address", async () => {
  const dns = makeDnsMock({ "internal.example.com": { a: ["10.0.0.5"] } });
  await assertRejects(
    () => assertPublicHost("internal.example.com", dns),
    ExtractionError,
  );
});

Deno.test("assertPublicHost rejects a domain with mixed public/private A records", async () => {
  const dns = makeDnsMock({
    "mixed.example.com": { a: [PUBLIC_IP, "127.0.0.1"] },
  });
  await assertRejects(
    () => assertPublicHost("mixed.example.com", dns),
    ExtractionError,
  );
});

Deno.test("assertPublicHost rejects a domain that fails to resolve at all", async () => {
  const dns = makeDnsMock({});
  await assertRejects(
    () => assertPublicHost("nowhere.invalid", dns),
    ExtractionError,
  );
});

Deno.test("assertSafeUrl rejects non-http(s) schemes", async () => {
  await assertRejects(
    () => assertSafeUrl("ftp://example.com/file"),
    ExtractionError,
  );
  await assertRejects(
    () => assertSafeUrl("file:///etc/passwd"),
    ExtractionError,
  );
});

Deno.test("assertSafeUrl rejects a malformed URL", async () => {
  await assertRejects(() => assertSafeUrl("not-a-url"), ExtractionError);
});

Deno.test("assertSafeUrl rejects the cloud metadata endpoint", async () => {
  await assertRejects(
    () => assertSafeUrl("http://169.254.169.254/latest/meta-data"),
    ExtractionError,
  );
});

Deno.test("assertSafeUrl accepts a public https URL", async () => {
  const dns = makeDnsMock({ "example.com": { a: [PUBLIC_IP] } });
  const parsed = await assertSafeUrl("https://example.com/article", dns);
  assertEquals(parsed.hostname, "example.com");
});

// ---------------------------------------------------------------------------
// HTML -> text extraction (pure)
// ---------------------------------------------------------------------------

Deno.test("extractReadableText pulls title + article text and drops scripts/styles", () => {
  const text = extractReadableText(SAMPLE_HTML);

  assert(text.includes("The Future of AI Content"));
  assert(text.includes("Artificial intelligence is rapidly changing"));
  assert(!text.includes("console.log"));
  assert(!text.includes("color: red"));
  assert(!text.includes("Menu"));
});

// ---------------------------------------------------------------------------
// extractTextFromUrl: fetch pipeline, redirects, content-type, body cap
// ---------------------------------------------------------------------------

Deno.test("extractTextFromUrl uses the extracted text from a mocked HTTP response", async () => {
  const fetchMock =
    (() =>
      Promise.resolve(htmlResponse(SAMPLE_HTML))) as unknown as typeof fetch;

  const text = await extractTextFromUrl(
    `https://${PUBLIC_IP}/article`,
    fetchMock,
  );

  assert(text.includes("The Future of AI Content"));
  assert(text.length > 200);
});

Deno.test("extractTextFromUrl rejects a malformed/disallowed URL before fetching", async () => {
  const failingFetch = (() => {
    throw new Error("fetch should not be called");
  }) as unknown as typeof fetch;

  await assertRejects(
    () => extractTextFromUrl("ftp://example.com/file", failingFetch),
    ExtractionError,
  );
});

Deno.test("extractTextFromUrl fails when the article is too short", async () => {
  const shortHtmlFetch = (() =>
    Promise.resolve(
      htmlResponse("<html><body><article>Too short.</article></body></html>"),
    )) as unknown as typeof fetch;

  await assertRejects(
    () => extractTextFromUrl(`https://${PUBLIC_IP}/tiny`, shortHtmlFetch),
    ExtractionError,
  );
});

Deno.test("extractTextFromUrl fails on a non-OK HTTP status", async () => {
  const notFoundFetch = (() =>
    Promise.resolve(
      htmlResponse("not found", 404),
    )) as unknown as typeof fetch;

  await assertRejects(
    () => extractTextFromUrl(`https://${PUBLIC_IP}/missing`, notFoundFetch),
    ExtractionError,
  );
});

Deno.test("extractTextFromUrl rejects disallowed content types", async () => {
  const jsonFetch = (() =>
    Promise.resolve(
      htmlResponse('{"ok":true}', 200, "application/json"),
    )) as unknown as typeof fetch;

  await assertRejects(
    () => extractTextFromUrl(`https://${PUBLIC_IP}/data`, jsonFetch),
    ExtractionError,
  );
});

Deno.test("extractTextFromUrl follows a redirect to another public host and re-validates it", async () => {
  const dns = makeDnsMock({ "safe.example.com": { a: [PUBLIC_IP] } });
  let callCount = 0;

  const fetchMock = (() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: `https://${PUBLIC_IP}/final` },
        }),
      );
    }
    return Promise.resolve(htmlResponse(SAMPLE_HTML));
  }) as unknown as typeof fetch;

  const text = await extractTextFromUrl(
    "https://safe.example.com/start",
    fetchMock,
    dns,
  );

  assertEquals(callCount, 2);
  assert(text.includes("The Future of AI Content"));
});

Deno.test("extractTextFromUrl rejects a redirect into a private IP", async () => {
  const dns = makeDnsMock({ "safe.example.com": { a: [PUBLIC_IP] } });
  let callCount = 0;

  const fetchMock = (() => {
    callCount++;
    return Promise.resolve(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      }),
    );
  }) as unknown as typeof fetch;

  await assertRejects(
    () => extractTextFromUrl("https://safe.example.com/start", fetchMock, dns),
    ExtractionError,
  );
  // The redirect target must be rejected by assertSafeUrl before a second fetch is attempted.
  assertEquals(callCount, 1);
});

Deno.test("extractTextFromUrl rejects a redirect chain longer than MAX_REDIRECTS", async () => {
  const dns = makeDnsMock({ "hop.example.com": { a: [PUBLIC_IP] } });
  let callCount = 0;

  const fetchMock = (() => {
    callCount++;
    return Promise.resolve(
      new Response(null, {
        status: 302,
        headers: { location: "https://hop.example.com/next" },
      }),
    );
  }) as unknown as typeof fetch;

  await assertRejects(
    () => extractTextFromUrl("https://hop.example.com/start", fetchMock, dns),
    ExtractionError,
  );
  // initial fetch + 3 allowed redirects = 4 calls; the 4th response is the
  // one that pushes past the limit and is never followed further.
  assertEquals(callCount, 4);
});

Deno.test("extractTextFromUrl caps the response body instead of reading it unbounded", async () => {
  const totalBytes = 3 * 1024 * 1024; // 3 MiB, over the 2 MiB cap
  const chunkSize = 64 * 1024;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const sent = (stream as unknown as { _sent?: number })._sent ?? 0;
      if (sent >= totalBytes) {
        controller.close();
        return;
      }
      const size = Math.min(chunkSize, totalBytes - sent);
      controller.enqueue(new Uint8Array(size).fill(97)); // 'a'
      (stream as unknown as { _sent?: number })._sent = sent + size;
    },
  });

  const fetchMock = (() =>
    Promise.resolve(
      new Response(stream, {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    )) as unknown as typeof fetch;

  const text = await extractTextFromUrl(`https://${PUBLIC_IP}/huge`, fetchMock);

  assert(text.length > 0);
  assert(text.length <= 2 * 1024 * 1024);
});
