"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getHistory } from "@/services/generations";
import type { HistoryItem } from "@/types";
import { formatDate } from "@/lib/utils";

export default function ProjectHistoryPage() {
  const search = useSearchParams();
  const projectId = search.get("project") || "demo";
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHistory(projectId).then(setItems).catch((err) => setError(err instanceof Error ? err.message : "Failed to load history")).finally(() => setLoading(false));
  }, [projectId]);

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/projects" className="backLink">← Projects</Link><div className="resultStatus">History · {projectId}</div></div>
      <section className="resultHero"><p className="eyebrow">GENERATIONS</p><h1>Project history</h1><p className="lead">Previous generations, statuses and costs.</p></section>
      {error && <section className="card errorBox">{error}</section>}
      <section className="card">{loading ? "Loading history…" : items.map((item) => <div className="historyRow" key={item.id}><div><strong>{item.source}</strong><small>{formatDate(item.created_at)}</small></div><span>{item.output_type}</span><span>${item.cost.toFixed(2)}</span><span>{item.status}</span><div className="historyActions"><Link href={`/projects/${projectId}/generate?from=${item.id}`} className="secondary">Create variation</Link><button className="secondary">Download</button></div></div>)}</section>
    </main>
  );
}
