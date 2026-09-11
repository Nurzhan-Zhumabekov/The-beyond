"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { generateContent } from "@/services/api";
import type { GenerationStatus, OutputType } from "@/types";

const steps = ["Analyzing material", "Creating content", "Generating image", "Applying brandbook", "Preparing result"];
const outputs: { id: OutputType; title: string }[] = [
  { id: "background", title: "Background Art" },
  { id: "poster", title: "Poster 1:1" },
  { id: "banner", title: "Banner 16:9" },
  { id: "package", title: "Full Media Package" },
];

export default function GeneratePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"text" | "url">("text");
  const [source, setSource] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("package");
  const [language, setLanguage] = useState("English");
  const [imageStyle, setImageStyle] = useState("Modern editorial");
  const [campaignName, setCampaignName] = useState("");
  const [additionalRequest, setAdditionalRequest] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!source.trim()) return;
    setStatus("loading");
    setError("");
    setActiveStep(0);
    const timer = window.setInterval(() => setActiveStep((step) => Math.min(step + 1, steps.length - 1)), 330);

    try {
      const result = await generateContent({ project_id: params.id, source_type: sourceType, source, output_type: outputType, language, image_style: imageStyle, additional_request: additionalRequest, campaign_name: campaignName });
      window.clearInterval(timer);
      setStatus("success");
      router.push(`/projects/${params.id}/generations/${result.id}`);
    } catch {
      window.clearInterval(timer);
      setStatus("error");
      setError("Generation failed. Please try again.");
    }
  }

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/projects" className="backLink">← Projects</Link><div className="topbarActions"><Link href={`/projects/${params.id}/history`} className="secondary">History</Link><Link href={`/projects/${params.id}/brandbook`} className="secondary">Brandbook</Link></div></div>
      <section className="resultHero"><p className="eyebrow">NEW GENERATION</p><h1>Create content</h1><p className="lead">Choose the source, output format and campaign settings.</p></section>

      <section className="card">
        <div className="sectionTitle"><span>01</span><div><h2>Source</h2><p>Text or article URL.</p></div></div>
        <div className="tabs"><button className={sourceType === "text" ? "tab selected" : "tab"} onClick={() => setSourceType("text")}>Text</button><button className={sourceType === "url" ? "tab selected" : "tab"} onClick={() => setSourceType("url")}>URL</button></div>
        {sourceType === "text" ? <textarea value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste source text…" /> : <input className="urlInput" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://example.com/article" />}
      </section>

      <section className="card">
        <div className="sectionTitle"><span>02</span><div><h2>Output</h2><p>Generate only what you need.</p></div></div>
        <div className="formatGrid">{outputs.map((item) => <button key={item.id} className={outputType === item.id ? "format selectedFormat" : "format"} onClick={() => setOutputType(item.id)}><strong>{item.title}</strong></button>)}</div>
      </section>

      <section className="card brandGrid">
        <label>Content language<select value={language} onChange={(e) => setLanguage(e.target.value)}><option>English</option><option>Русский</option><option>Қазақша</option></select></label>
        <label>Image style<select value={imageStyle} onChange={(e) => setImageStyle(e.target.value)}><option>Modern editorial</option><option>Minimal</option><option>Bold</option><option>Corporate</option></select></label>
        <label>Campaign name<input className="urlInput" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="September launch" /></label>
        <label>Additional request<input className="urlInput" value={additionalRequest} onChange={(e) => setAdditionalRequest(e.target.value)} placeholder="Make it darker and more minimal" /></label>
      </section>

      {status === "loading" && <section className="card"><strong>Generating…</strong><div className="generationSteps">{steps.map((step, index) => <div key={step} className={index <= activeStep ? "generationStep activeStep" : "generationStep"}>{index < activeStep ? "✓" : index === activeStep ? "●" : "○"} {step}</div>)}</div></section>}
      {status === "error" && <section className="card errorBox">{error}<button className="secondary" onClick={handleGenerate}>Retry</button></section>}
      <div className="actions"><span>Generate is disabled until a source is entered.</span><button className="generate" disabled={!source.trim() || status === "loading"} onClick={handleGenerate}>{status === "loading" ? "Generating…" : "Generate →"}</button></div>
    </main>
  );
}
