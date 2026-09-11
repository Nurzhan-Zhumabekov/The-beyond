/**
 * Cleans and truncates raw text before it is sent to the LLM.
 */

export const DEFAULT_MAX_LENGTH = 14000;
const TRUNCATION_MARKER = "\n\n[...]\n\n";
const HEAD_RATIO = 0.7;

/** Normalizes whitespace and drops duplicate consecutive lines. */
export function cleanText(text: string): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ");

  const seen = new Set<string>();
  const lines: string[] = [];

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      lines.push("");
      continue;
    }
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Keeps the beginning (most important part) and a tail slice of the text. */
export function truncateForPrompt(
  text: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  if (text.length <= maxLength) return text;

  const budget = maxLength - TRUNCATION_MARKER.length;
  if (budget <= 0) return text.slice(0, maxLength);

  const headLen = Math.floor(budget * HEAD_RATIO);
  const tailLen = budget - headLen;

  const head = text.slice(0, headLen);
  const tail = tailLen > 0 ? text.slice(-tailLen) : "";
  return `${head}${TRUNCATION_MARKER}${tail}`.trim();
}

/** Full pipeline: clean, then truncate to a safe size for the prompt. */
export function prepareTextForLLM(
  rawText: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  return truncateForPrompt(cleanText(rawText), maxLength);
}
