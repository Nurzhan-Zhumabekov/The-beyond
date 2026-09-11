"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useGeneration } from "@/hooks/useGeneration";
import { projectIdFromPath } from "@/lib/utils";
import type { OutputType } from "@/types";

const steps = ["Analyzing material", "Creating content", "Generating image", "Applying brandbook", "Preparing result"];
const outputs: { id: OutputType; title: string; description: string }[] = [
  { id: "background", title: "Background Art", description: "Clean AI-generated background" },
  { id: "poster", title: "Poster 1:1", description: "Square branded visual" },
  { id: "banner", title: "Banner 16:9", description: "Horizontal branded banner" },
  { id: "media_pack", title: "Full Media Package", description: "Copy, background, poster and banner" }
];

export default function GeneratePage() {
  const pathname = usePathname();
  const projectId = projectIdFromPath(pathname);
  const { status, result, error, generate, reset } = useGeneration();
  const [sourceType, setSourceType] = useState<"text" | "url">("text");
  const [source, setSource] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("media_pack");
  const [language, setLanguage] = useState("en");
  const [imageStyle, setImageStyle] = useState("Modern editorial");
  const [campaignName, setCampaignName] = useState("");
  const [additionalRequest, setAdditionalRequest] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [copyTab, setCopyTab] = useState<"telegram" | "instagram" | "linkedin">("telegram");
  const [copied, setCopied] = useState(false);

  const activeCopy = useMemo(() => {
    if (!result) return "";
    if (copyTab === "telegram") return result.telegram_post;
    if (copyTab === "instagram") return result.instagram_post;
    return result.linkedin_post;
  }, [copyTab, result]);

  async function handleGenerate() {
    if (!source.trim() || status === "loading") return;
    setActiveStep(0);
    const timer = window.setInterval(() => setActiveStep((value) => Math.min(value + 1, steps.length - 1)), 320);
    try {
      await generate({ project_id: projectId, source_type: sourceType, source: source.trim(), output_type: outputType, language, image_style: imageStyle, additional_instructions: additionalRequest.trim(), campaign_name: campaignName.trim() || undefined });
    } finally {
      window.clearInterval(timer);
      setActiveStep(steps.length - 1);
    }
  }

  async function copyText() {
    if (!activeCopy) return;
    await navigator.clipboard.writeText(activeCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  const showBackground = outputType === "background" || outputType === "media_pack";
  const showPoster = outputType === "poster" || outputType === "media_pack";
  const showBanner = outputType === "banner" || outputType === "media_pack";

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href={`/projects/${projectId}`} className="backLink">← Project</Link><Link href={`/projects/${projectId}/brandbook`} className="secondary">Brandbook</Link></div>
      <section className="resultHero"><p className="eyebrow">NEW GENERATION</p><h1>Create content</h1><p className="lead">Turn text or an article URL into branded content.</p></section>

      <section className="card">
        <div className="sectionTitle"><span>01</span><div><h2>Source</h2><p>Choose text or URL.</p></div></div>
        <div className="tabs"><button className={sourceType === "text" ? "tab selected" : "tab"} onClick={() => setSourceType("text")}>Text</button><button className={sourceType === "url" ? "tab selected" : "tab"} onClick={() => setSourceType("url")}>URL</button></div>
        {sourceType === "text" ? <textarea value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste source text…" /> : <input className="urlInput" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://example.com/article" />}
      </section>

      <section className="card">
        <div className="sectionTitle"><span>02</span><div><h2>Output</h2><p>Generate only what you need.</p></div></div>
        <div className="formatGrid">{outputs.map((item) => <button key={item.id} className={outputType === item.id ? "format selectedFormat" : "format"} onClick={() => setOutputType(item.id)}><strong>{item.title}</strong><small>{item.description}</small></button>)}</div>
      </section>

      <section className="card brandGrid">
        <label>Content language<select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="en">English</option><option value="ru">Русский</option><option value="kk">Қазақша</option><option value="auto">Detect automatically</option></select></label>
        <label>Image style<select value={imageStyle} onChange={(e) => setImageStyle(e.target.value)}><option>Modern editorial</option><option>Minimal</option><option>Bold</option><option>Corporate</option></select></label>
        <label>Campaign name<input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="September launch" /></label>
        <label>Additional request<input value={additionalRequest} onChange={(e) => setAdditionalRequest(e.target.value)} placeholder="Darker, cleaner, more minimal" /></label>
      </section>

      {status === "loading" && <section className="card"><strong>Generating…</strong><div className="generationSteps">{steps.map((step, index) => <div key={step} className={index <= activeStep ? "generationStep activeStep" : "generationStep"}>{index < activeStep ? "✓" : index === activeStep ? "●" : "○"} {step}</div>)}</div></section>}
      {status === "error" && <section className="card errorBox"><span>{error}</span><button className="secondary" onClick={handleGenerate}>Retry</button></section>}

      <div className="actions"><span>Generate is disabled until a source is entered.</span><button className="generate" disabled={!source.trim() || status === "loading"} onClick={handleGenerate}>{status === "loading" ? "Generating…" : "Generate →"}</button></div>

      {result && status === "success" && <>
        <section className="metricsGrid"><div className="metricCard"><span>Cost</span><strong>${result.cost.toFixed(2)}</strong></div><div className="metricCard"><span>API calls</span><strong>{result.api_calls}</strong></div><div className="metricCard"><span>Status</span><strong>{result.status}</strong></div></section>
        <section className="card"><p className="eyebrow">RESULT</p><h2>{result.title}</h2><ul className="keyPointList">{result.key_points.map((point) => <li key={point}>{point}</li>)}</ul></section>
        <section className="card"><div className="tabs">{(["telegram", "instagram", "linkedin"] as const).map((tab) => <button key={tab} className={copyTab === tab ? "tab selected" : "tab"} onClick={() => setCopyTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div><textarea className="resultText" value={activeCopy} readOnly /><div className="visualActions"><button className="secondary" onClick={copyText}>{copied ? "Copied ✓" : "Copy"}</button></div></section>
        <section className="card"><div className="sectionTitle"><span>03</span><div><h2>Visual assets</h2><p>Generated once, then rendered with your brandbook.</p></div></div>{showBackground && (result.background_url ? <a href={result.background_url} download className="visualPreview background"><img src={result.background_url} alt="Generated background" /></a> : <div className="visualPreview background"><div className="previewGlow"/><div className="artLabel">BACKGROUND ART</div></div>)}{showPoster && (result.poster_square_url ? <a href={result.poster_square_url} download className="visualPreview poster" style={{ marginTop: 14 }}><img src={result.poster_square_url} alt="Branded square poster" /></a> : <div className="visualPreview poster" style={{ marginTop: 14 }}><div className="previewGlow"/><div className="previewLogo">BEYOND</div><div className="previewHeadline">{result.title.toUpperCase()}</div></div>)}{showBanner && (result.banner_wide_url ? <a href={result.banner_wide_url} download className="visualPreview banner" style={{ marginTop: 14 }}><img src={result.banner_wide_url} alt="Branded wide banner" /></a> : <div className="visualPreview banner" style={{ marginTop: 14 }}><div className="previewGlow"/><div className="previewLogo">BEYOND</div><div className="previewHeadline">{result.title.toUpperCase()}</div></div>)}<div className="visualActions wrapActions"><button className="secondary" onClick={reset}>Generate another</button></div></section>
        <div className="visualActions"><a href={`/api/generations/${result.id}/export`} className="secondary">Download media pack (ZIP)</a></div>
      </>}
    </main>
  );
}
