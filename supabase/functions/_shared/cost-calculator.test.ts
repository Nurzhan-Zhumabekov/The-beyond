import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateEstimatedCost } from "./cost-calculator.ts";

Deno.test("calculateEstimatedCost returns a positive cost for a known model", () => {
  const cost = calculateEstimatedCost(1200, 700, "gpt-4o-mini");
  assert(cost > 0);
});

Deno.test("calculateEstimatedCost returns 0 for an unknown model instead of throwing", () => {
  const cost = calculateEstimatedCost(1200, 700, "not-a-real-model");
  assertEquals(cost, 0);
});

Deno.test("calculateEstimatedCost returns 0 for the mock model", () => {
  assertEquals(calculateEstimatedCost(1000, 1000, "mock"), 0);
});

Deno.test("calculateEstimatedCost is never negative", () => {
  const models = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo", "mock", "unknown"];
  for (const model of models) {
    const cost = calculateEstimatedCost(0, 0, model);
    assert(cost >= 0);
  }
  for (const model of models) {
    const cost = calculateEstimatedCost(50000, 50000, model);
    assert(cost >= 0);
  }
});
