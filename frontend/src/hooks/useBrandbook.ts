"use client";

import { useEffect, useState } from "react";
import { getBrandbook, saveBrandbook } from "@/services/brandbook";
import type { Brandbook } from "@/types";

export function useBrandbook(projectId: string) {
  const [brandbook, setBrandbook] = useState<Brandbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getBrandbook(projectId).then(setBrandbook).catch((err) => setError(err instanceof Error ? err.message : "Failed to load brandbook")).finally(() => setLoading(false));
  }, [projectId]);

  async function save(next: Brandbook) {
    setSaving(true);
    try {
      const saved = await saveBrandbook(projectId, next);
      setBrandbook(saved);
      return saved;
    } finally {
      setSaving(false);
    }
  }

  return { brandbook, setBrandbook, loading, saving, error, save };
}
