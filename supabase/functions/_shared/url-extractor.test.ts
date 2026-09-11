import {
  assert,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractReadableText,
  extractTextFromUrl,
  ExtractionError,
  validateUrl,
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

Deno.test("validateUrl rejects an invalid scheme", () => {
  assertThrows(() => validateUrl("not-a-url"), ExtractionError);
});

Deno.test("validateUrl rejects an empty URL", () => {
  assertThrows(() => validateUrl(""), ExtractionError);
});

Deno.test("validateUrl accepts http and https", () => {
  validateUrl("http://example.com");
  validateUrl("https://example.com");
});

Deno.test("extractReadableText pulls title + article text and drops scripts/styles", () => {
  const text = extractReadableText(SAMPLE_HTML);

  assert(text.includes("The Future of AI Content"));
  assert(text.includes("Artificial intelligence is rapidly changing"));
  assert(!text.includes("console.log"));
  assert(!text.includes("color: red"));
  assert(!text.includes("Menu"));
});

Deno.test("extractTextFromUrl rejects a malformed URL before fetching", async () => {
  await assertRejects(
    () => extractTextFromUrl("ftp://example.com/file"),
    ExtractionError,
  );
});

Deno.test("extractTextFromUrl uses the extracted text from a mocked HTTP response", async () => {
  const mockFetch = ((): typeof fetch => {
    return (() =>
      Promise.resolve(
        new Response(SAMPLE_HTML, { status: 200 }),
      )) as unknown as typeof fetch;
  })();

  const text = await extractTextFromUrl("https://example.com/article", mockFetch);

  assert(text.includes("The Future of AI Content"));
  assert(text.length > 200);
});

Deno.test("extractTextFromUrl fails when the article is too short", async () => {
  const shortHtmlFetch = (() =>
    Promise.resolve(
      new Response("<html><body><article>Too short.</article></body></html>", {
        status: 200,
      }),
    )) as unknown as typeof fetch;

  await assertRejects(
    () => extractTextFromUrl("https://example.com/tiny", shortHtmlFetch),
    ExtractionError,
  );
});

Deno.test("extractTextFromUrl fails on a non-OK HTTP status", async () => {
  const notFoundFetch = (() =>
    Promise.resolve(new Response("not found", { status: 404 }))) as unknown as typeof fetch;

  await assertRejects(
    () => extractTextFromUrl("https://example.com/missing", notFoundFetch),
    ExtractionError,
  );
});
