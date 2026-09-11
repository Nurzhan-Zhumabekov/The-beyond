"use client";

import { useState } from "react";
import { generationsService } from "@/services/generations";
import type { GenerationRequest, GenerationResult } from "@/types";

export function useGeneration() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(payload: GenerationRequest) {
    setLoading(true);
    setError(null);
    try {
      const next = await generationsService.generate(payload);
      setResult(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { result, loading, error, generate, setResult };
}
