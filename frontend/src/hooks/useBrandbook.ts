"use client";

import { useEffect, useState } from "react";
import { brandbookService } from "@/services/brandbook";
import type { Brandbook } from "@/types";

export function useBrandbook(projectId: string) {
  const [brandbook, setBrandbook] = useState<Brandbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    brandbookService.get(projectId)
      .then((data) => { if (active) setBrandbook(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Unable to load brandbook."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  async function save(next: Brandbook) {
    setSaving(true);
    setError(null);
    try {
      const saved = await brandbookService.save(projectId, next);
      setBrandbook(saved);
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save brandbook.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return { brandbook, setBrandbook, loading, saving, error, save };
}
