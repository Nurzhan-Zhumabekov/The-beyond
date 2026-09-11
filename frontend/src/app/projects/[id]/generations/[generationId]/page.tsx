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
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    getGeneration(params.generationId)
      .then((data) => {
        setResult(data);
        if (data.output_type === "background") setVisualTab("background");
        if (data.output_type === "banner") setVisualTab("banner");
      })
      .catch(() => setError("Could not load this generation."))
      .finally(() => setLoading(false));
  }, [params.generationId]);

  const activeCopy = useMemo(() => {
    if (!result) return "";
    if (copyTab === "telegram") return result.telegram_post;
    if (copyTab === "instagram") return result.instagram_post;
    return result.linkedin_post;
  }, [copyTab, result]);

  const availableVisuals = useMemo<VisualTab[]>(() => {
    if (!result) return [];
    if (result.output_type === "package") return ["background", "poster", "banner"];
    if (result.output_type === "background") return ["background"];
    if (result.output_type === "poster") return ["poster"];
    return ["banner"];
  }, [result]);

  function activeAssetUrl() {
    if (!result) return undefined;
    if (visualTab === "background") return result.background_url;
    if (visualTab === "poster") return result.poster_square_url;
    return result.banner_wide_url;
  }

  async function copyText() {
    await navigator.clipboard.writeText(activeCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function downloadAsset() {
    if (!result) return;
    const url = activeAssetUrl();
    const filename = `${result.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset"}-${visualTab}`;

    if (url && !url.startsWith("/mock/")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${visualTab === "poster" ? 1080 : 1920}" height="1080"><rect width="100%" height="100%" fill="#10131a"/><circle cx="75%" cy="25%" r="260" fill="#7c5cff" opacity=".55"/><text x="7%" y="14%" fill="#fff" font-family="Arial" font-size="44" font-weight="700">BEYOND</text><text x="7%" y="78%" fill="#fff" font-family="Arial" font-size="74" font-weight="700">${result.title.replace(/[&<>]/g, "")}</text></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function makeVariant(instruction = variantInstruction) {
    setVariantLoading(true);
    setActionMessage("");
    try {
      await createVariant(`${params.generationId}-${visualTab}`, instruction);
      setShowVariant(false);
      setVariantInstruction("");
      setActionMessage("New variation created and kept separately from the original.");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not create variation.");
    } finally {
      setVariantLoading(false);
    }
  }

  async function convertFormat() {
    const target: VisualTab = visualTab === "banner" ? "poster" : "banner";
    await makeVariant(`Convert this asset to ${target === "poster" ? "1:1 poster" : "16:9 banner"} while preserving the same brand style and message.`);
    setVisualTab(target);
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
        <div className="sectionTitle"><span>03</span><div><h2>Visual assets</h2><p>Only the asset types requested for this generation are shown.</p></div></div>
        <div className="tabs">
          {availableVisuals.includes("background") && <button className={visualTab === "background" ? "tab selected" : "tab"} onClick={() => setVisualTab("background")}>Background Art</button>}
          {availableVisuals.includes("poster") && <button className={visualTab === "poster" ? "tab selected" : "tab"} onClick={() => setVisualTab("poster")}>Poster 1:1</button>}
          {availableVisuals.includes("banner") && <button className={visualTab === "banner" ? "tab selected" : "tab"} onClick={() => setVisualTab("banner")}>Banner 16:9</button>}
        </div>

        <div className={`visualPreview ${visualTab}`}>
          <div className="previewGlow" />
          {visualTab !== "background" && <div className="previewLogo">BEYOND</div>}
          {visualTab !== "background" && <div className="previewHeadline">{result.title.toUpperCase()}</div>}
          {visualTab === "background" && <div className="artLabel">AI GENERATED BACKGROUND ART</div>}
        </div>

        <div className="visualActions wrapActions">
          <button className="secondary" onClick={downloadAsset}>Download</button>
          <Link href={`/editor/${params.generationId}-${visualTab}`} className="secondary">Edit</Link>
          <button className="secondary" onClick={() => setShowVariant((value) => !value)}>Create variation</button>
          <button className="secondary" onClick={convertFormat} disabled={variantLoading}>Convert format</button>
        </div>

        {actionMessage && <div className="formNotice">{actionMessage}</div>}

        {showVariant && (
          <div className="refineBox">
            <strong>Create a new variation</strong>
            <textarea value={variantInstruction} onChange={(e) => setVariantInstruction(e.target.value)} placeholder="Example: darker background, smaller logo, more minimal layout." />
            <button className="generate" onClick={() => makeVariant()} disabled={variantLoading}>{variantLoading ? "Creating…" : "Create variation"}</button>
          </div>
        )}
      </section>
    </main>
  );
}
