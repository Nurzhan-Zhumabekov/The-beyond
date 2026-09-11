"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createVariant, getGeneration } from "@/services/api";
import type { GenerationResult } from "@/types";

type CopyTab = "telegram" | "instagram" | "linkedin";
type VisualTab = "background" | "poster" | "banner";

export default function GenerationResultPage() {
  const params = useParams<{ id: string; generationId: string }>();
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyTab, setCopyTab] = useState<CopyTab>("telegram");
  const [visualTab, setVisualTab] = useState<VisualTab>("poster");
  const [copied, setCopied] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantInstruction, setVariantInstruction] = useState("");
  const [showVariant, setShowVariant] = useState(false);

  useEffect(() => {
    getGeneration(params.generationId)
      .then(setResult)
      .catch(() => setError("Could not load this generation."))
      .finally(() => setLoading(false));
  }, [params.generationId]);

  const activeCopy = useMemo(() => {
    if (!result) return "";
    if (copyTab === "telegram") return result.telegram_post;
    if (copyTab === "instagram") return result.instagram_post;
    return result.linkedin_post;
  }, [copyTab, result]);

  async function copyText() {
    await navigator.clipboard.writeText(activeCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function makeVariant() {
    setVariantLoading(true);
    try {
      await createVariant(`${params.generationId}-${visualTab}`, variantInstruction);
      setShowVariant(false);
      setVariantInstruction("");
    } finally {
      setVariantLoading(false);
    }
  }

  if (loading) return <main className="resultPage"><section className="card">Loading generation…</section></main>;
  if (error || !result) return <main className="resultPage"><section className="card errorBox">{error || "Generation not found."}</section></main>;

  return (
    <main className="resultPage">
      <div className="resultTopbar">
        <Link href={`/projects/${params.id}/history`} className="backLink">← Project history</Link>
        <div className="resultStatus">{result.status} · {new Date(result.created_at).toLocaleString()}</div>
      </div>

      <section className="resultHero">
        <p className="eyebrow">GENERATION COMPLETE</p>
        <h1>{result.title}</h1>
        <p className="lead">Review, edit, create a variation or download the assets you need.</p>
      </section>

      <section className="metricsGrid">
        <div className="metricCard"><span>Generation cost</span><strong>${result.cost.toFixed(2)}</strong></div>
        <div className="metricCard"><span>API calls</span><strong>{result.api_calls}</strong></div>
        <div className="metricCard"><span>Status</span><strong>{result.status}</strong></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><span>01</span><div><h2>Key points</h2><p>Main ideas extracted from the source.</p></div></div>
        <ul className="keyPointList">{result.key_points.map((point) => <li key={point}>{point}</li>)}</ul>
      </section>

      <section className="card">
        <div className="sectionTitle"><span>02</span><div><h2>Social copy</h2><p>Platform-specific text ready for review.</p></div></div>
        <div className="tabs">
          {(["telegram", "instagram", "linkedin"] as CopyTab[]).map((tab) => (
            <button key={tab} className={copyTab === tab ? "tab selected" : "tab"} onClick={() => setCopyTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>
        <textarea className="resultText" value={activeCopy} readOnly />
        <div className="visualActions"><button className="secondary" onClick={copyText}>{copied ? "Copied ✓" : "Copy"}</button></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><span>03</span><div><h2>Visual assets</h2><p>Only requested asset types should be shown when the real API is connected.</p></div></div>
        <div className="tabs">
          <button className={visualTab === "background" ? "tab selected" : "tab"} onClick={() => setVisualTab("background")}>Background Art</button>
          <button className={visualTab === "poster" ? "tab selected" : "tab"} onClick={() => setVisualTab("poster")}>Poster 1:1</button>
          <button className={visualTab === "banner" ? "tab selected" : "tab"} onClick={() => setVisualTab("banner")}>Banner 16:9</button>
        </div>

        <div className={`visualPreview ${visualTab}`}>
          <div className="previewGlow" />
          {visualTab !== "background" && <div className="previewLogo">BEYOND</div>}
          {visualTab !== "background" && <div className="previewHeadline">{result.title.toUpperCase()}</div>}
          {visualTab === "background" && <div className="artLabel">AI GENERATED BACKGROUND ART</div>}
        </div>

        <div className="visualActions wrapActions">
          <button className="secondary">Download</button>
          <Link href={`/editor/${params.generationId}-${visualTab}`} className="secondary">Edit</Link>
          <button className="secondary" onClick={() => setShowVariant((value) => !value)}>Create variation</button>
          <button className="secondary">Convert format</button>
        </div>

        {showVariant && (
          <div className="refineBox">
            <strong>Create a new variation</strong>
            <textarea value={variantInstruction} onChange={(e) => setVariantInstruction(e.target.value)} placeholder="Example: darker background, smaller logo, more minimal layout." />
            <button className="generate" onClick={makeVariant} disabled={variantLoading}>{variantLoading ? "Creating…" : "Create variation"}</button>
          </div>
        )}
      </section>
    </main>
  );
}
