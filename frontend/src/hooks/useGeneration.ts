"use client";

import { useState } from "react";
import { generateContent } from "@/services/generations";
import type { GenerationRequest, GenerationResult, GenerationStatus } from "@/types";

export function useGeneration() {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState("");

  async function generate(payload: GenerationRequest) {
    setStatus("loading");
    setError("");
    try {
      const data = await generateContent(payload);
      setResult(data);
      setStatus("success");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStatus("error");
      throw err;
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setError("");
  }

  return { status, result, error, generate, reset };
}
