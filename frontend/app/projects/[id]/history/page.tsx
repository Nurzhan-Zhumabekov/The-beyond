"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getHistory } from "@/services/api";
import type { HistoryItem } from "@/types";

export default function ProjectHistoryPage() {
  const params = useParams<{ id: string }>();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getHistory(params.id).then(setItems).finally(() => setLoading(false)); }, [params.id]);

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href={`/projects/${params.id}/generate`} className="backLink">← Generation</Link><div className="resultStatus">Project History</div></div>
      <section className="resultHero"><p className="eyebrow">GENERATIONS</p><h1>History</h1><p className="lead">Open an old generation, download it or create a new variation from it.</p></section>
      <section className="card">
        {loading ? "Loading history…" : items.map((item) => (
          <div key={item.id} className="historyRow">
            <div><strong>{item.source}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div>
            <span>{item.output_type}</span><span>${item.cost.toFixed(2)}</span><span>{item.status}</span>
            <div className="historyActions"><Link href={`/result?generation=${item.id}`} className="secondary">Open</Link><button className="secondary">Download</button><Link href={`/projects/${params.id}/generate?from=${item.id}`} className="secondary">New variation</Link></div>
          </div>
        ))}
      </section>
    </main>
  );
}
