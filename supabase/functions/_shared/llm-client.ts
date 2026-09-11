/**
 * Single LLM client used by the content pipeline.
 *
 * Configuration comes from Supabase Secrets / env vars only — no
 * hardcoded API keys:
 *
 *   OPENAI_API_KEY
 *   OPENAI_MODEL
 *   LLM_MOCK_MODE
 *
 * When LLM_MOCK_MODE is true (the default), no network call is made and
 * a mock payload with the same JSON shape as a real response is
 * returned, so demos/tests never incur real cost.
 */

import type { LLMPayload } from "./types.ts";
import { parseLlmJson } from "./json-parser.ts";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const MAX_TOTAL_ATTEMPTS = 2; // one retry, i.e. at most two attempts total

export class LLMError extends Error {}
/** A retryable failure (network error, timeout, 5xx). */
export class TransientLLMError extends LLMError {}

export interface LLMResult {
  content: LLMPayload;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

function isMockMode(): boolean {
  const raw = Deno.env.get("LLM_MOCK_MODE");
  if (raw === undefined) return true;
  return ["1", "true", "yes"].includes(raw.trim().toLowerCase());
}

function getApiKey(): string | null {
  return Deno.env.get("OPENAI_API_KEY") ?? null;
}

function getModel(): string {
  return Deno.env.get("OPENAI_MODEL") ?? DEFAULT_MODEL;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.floor(text.length / 4));
}

function guessLanguage(text: string): "ru" | "kk" | "en" {
  if (/[әғқңөұүһӘҒҚҢӨҰҮҺ]/.test(text)) return "kk";
  if (/[а-яёА-ЯЁ]/.test(text)) return "ru";
  return "en";
}

function extractSnippet(prompt: string, length = 40): string {
  const marker = 'SOURCE MATERIAL:\n"""\n';
  const idx = prompt.indexOf(marker);
  const raw = idx === -1 ? prompt : prompt.slice(idx + marker.length);
  const snippet = raw.replace(/\s+/g, " ").trim();
  return snippet.slice(0, length) || "Untitled";
}

function buildMockPayload(prompt: string): LLMPayload {
  const language = guessLanguage(prompt);
  const snippet = extractSnippet(prompt);

  const titles: Record<string, string> = {
    ru: `Мок-заголовок: ${snippet}`,
    kk: `Мок-тақырып: ${snippet}`,
    en: `Mock title: ${snippet}`,
  };
  const keyPoints: Record<string, string[]> = {
    ru: [
      "Первый ключевой тезис из материала (мок).",
      "Второй ключевой тезис из материала (мок).",
      "Третий ключевой тезис из материала (мок).",
    ],
    kk: [
      "Материалдың бірінші негізгі тезисі (мок).",
      "Материалдың екінші негізгі тезисі (мок).",
      "Материалдың үшінші негізгі тезисі (мок).",
    ],
    en: [
      "First key takeaway from the material (mock).",
      "Second key takeaway from the material (mock).",
      "Third key takeaway from the material (mock).",
    ],
  };
  const posts: Record<string, { telegram: string; instagram: string; linkedin: string }> = {
    ru: {
      telegram: `[MOCK] ${titles.ru}\n\nКраткий пересказ материала для Telegram.`,
      instagram: `[MOCK] ${titles.ru} ✨ #контент #AI`,
      linkedin: `[MOCK] ${titles.ru} — ключевые выводы для профессионалов.`,
    },
    kk: {
      telegram: `[MOCK] ${titles.kk}\n\nTelegram үшін қысқаша мазмұндама.`,
      instagram: `[MOCK] ${titles.kk} ✨ #контент #AI`,
      linkedin: `[MOCK] ${titles.kk} — мамандарға арналған негізгі қорытындылар.`,
    },
    en: {
      telegram: `[MOCK] ${titles.en}\n\nShort summary of the material for Telegram.`,
      instagram: `[MOCK] ${titles.en} ✨ #content #AI`,
      linkedin: `[MOCK] ${titles.en} — key takeaways for professionals.`,
    },
  };

  return {
    detected_language: language,
    title: titles[language],
    key_points: keyPoints[language],
    telegram: posts[language].telegram,
    instagram: posts[language].instagram,
    linkedin: posts[language].linkedin,
    image_prompt:
      "Abstract conceptual illustration representing the topic, cinematic lighting, " +
      "modern digital art style, no text, no letters, no watermark",
  };
}

function mockGenerate(prompt: string): LLMResult {
  const payload = buildMockPayload(prompt);
  return {
    content: payload,
    inputTokens: estimateTokens(prompt),
    outputTokens: estimateTokens(JSON.stringify(payload)),
    model: "mock",
  };
}

async function requestOpenAi(
  prompt: string,
  apiKey: string,
  model: string,
  fetchImpl: typeof fetch,
): Promise<LLMResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TransientLLMError("Timed out while calling the LLM");
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new TransientLLMError(`Network error while calling the LLM: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new TransientLLMError(`LLM API returned a server error (${response.status})`);
    }
    throw new LLMError(`LLM API returned an error (${response.status})`);
  }

  const data = await response.json();
  const messageContent = data?.choices?.[0]?.message?.content;
  if (typeof messageContent !== "string") {
    throw new LLMError("Unexpected LLM response format: missing message content");
  }

  const parsed = parseLlmJson(messageContent);
  const usage = data?.usage ?? {};

  return {
    content: parsed,
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : estimateTokens(prompt),
    outputTokens:
      typeof usage.completion_tokens === "number"
        ? usage.completion_tokens
        : estimateTokens(messageContent),
    model,
  };
}

async function callOpenAiWithRetry(
  prompt: string,
  fetchImpl: typeof fetch,
): Promise<LLMResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new LLMError("OPENAI_API_KEY is not configured");
  }
  const model = getModel();

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_TOTAL_ATTEMPTS; attempt++) {
    try {
      return await requestOpenAi(prompt, apiKey, model, fetchImpl);
    } catch (err) {
      lastError = err;
      const isTransient = err instanceof TransientLLMError;
      if (!isTransient || attempt === MAX_TOTAL_ATTEMPTS) {
        throw err;
      }
    }
  }
  // Unreachable, but keeps TypeScript happy.
  throw lastError instanceof Error ? lastError : new LLMError(String(lastError));
}

/**
 * Generates structured content from the given prompt.
 * `fetchImpl` can be overridden in tests to avoid real network/API calls.
 */
export async function generateJson(
  prompt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LLMResult> {
  if (isMockMode()) {
    return mockGenerate(prompt);
  }
  return callOpenAiWithRetry(prompt, fetchImpl);
}
