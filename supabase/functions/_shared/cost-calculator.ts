/**
 * Estimates the cost of an LLM call based on token usage.
 */

export interface ModelPricing {
  input: number;
  output: number;
}

// Approximate list prices in USD per 1,000 tokens. Update as pricing changes.
export const PRICING_PER_1K_TOKENS: Record<string, ModelPricing> = {
  // Keep free-tier estimates at zero. Configure paid prices in deployment
  // before enabling billing/reporting; provider prices change over time.
  "gemini-3.1-flash-lite": { input: 0, output: 0 },
  "gemini-2.5-flash-lite": { input: 0, output: 0 },
  "mock": { input: 0, output: 0 },
};

/** Returns an estimated cost in USD, or 0 for an unknown model (never throws). */
export function calculateEstimatedCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
): number {
  const pricing = PRICING_PER_1K_TOKENS[model];
  if (!pricing) return 0;

  const cost =
    (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
