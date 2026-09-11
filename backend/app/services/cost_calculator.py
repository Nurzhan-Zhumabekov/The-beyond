"""Estimates the cost of an LLM call based on token usage."""
from __future__ import annotations

# Approximate list prices in USD per 1,000 tokens. Update as pricing changes.
PRICING_PER_1K_TOKENS: dict[str, dict[str, float]] = {
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4o": {"input": 0.0025, "output": 0.01},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "mock": {"input": 0.0, "output": 0.0},
}


def calculate_estimated_cost(input_tokens: int, output_tokens: int, model: str) -> float:
    pricing = PRICING_PER_1K_TOKENS.get(model)
    if pricing is None:
        return 0.0

    cost = (input_tokens / 1000) * pricing["input"] + (output_tokens / 1000) * pricing["output"]
    return round(cost, 6)
