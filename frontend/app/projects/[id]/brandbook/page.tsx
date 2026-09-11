"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrandbook, saveBrandbook } from "@/services/api";
import type { Brandbook } from "@/types";

export default function ProjectBrandbookPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<Brandbook | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getBrandbook(params.id).then(setForm); }, [params.id]);
  if (!form) return <main className="resultPage"><section className="card">Loading brandbook…</section></main>;

  const patch = <K extends keyof Brandbook>(key: K, value: Brandbook[K]) => setForm((current) => current ? { ...current, [key]: value } : current);

  async function submit() {
    setSaving(true); setSaved(false);
    await saveBrandbook(params.id, form);
    setSaving(false); setSaved(true);
  }

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href={`/projects/${params.id}/generate`} className="backLink">← Generation</Link><div className="resultStatus">Project Brandbook</div></div>
      <section className="resultHero"><p className="eyebrow">BRAND SYSTEM</p><h1>Brandbook</h1><p className="lead">These settings are reused for every generation in this project.</p></section>
      <div className="brandbookLayout">
        <section className="card brandGrid">
          <label>Brand name<input className="urlInput" value={form.brand_name} onChange={(e) => patch("brand_name", e.target.value)} /></label>
          <label>Primary color<input type="color" value={form.primary_color} onChange={(e) => patch("primary_color", e.target.value)} /></label>
          <label>Text color<input type="color" value={form.text_color} onChange={(e) => patch("text_color", e.target.value)} /></label>
          <label>Overlay color<input type="color" value={form.overlay_color} onChange={(e) => patch("overlay_color", e.target.value)} /></label>
          <label>Overlay opacity · {Math.round(form.overlay_opacity * 100)}%<input type="range" min="0" max="1" step="0.05" value={form.overlay_opacity} onChange={(e) => patch("overlay_opacity", Number(e.target.value))} /></label>
          <label>Heading font<select value={form.heading_font} onChange={(e) => patch("heading_font", e.target.value)}><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
          <label>Body font<select value={form.body_font} onChange={(e) => patch("body_font", e.target.value)}><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
          <label>Light logo<input type="file" accept="image/png,image/svg+xml" /></label>
          <label>Dark logo<input type="file" accept="image/png,image/svg+xml" /></label>
          <div className="visualActions"><button className="generate" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Save brandbook"}</button>{saved && <span>Saved</span>}</div>
        </section>
        <section className="card brandPreviewCard"><p className="eyebrow">PREVIEW</p><div className="brandPreview" style={{ background: form.primary_color, color: form.text_color, fontFamily: form.heading_font }}><div className="previewLogo">{form.brand_name || "BRAND"}</div><div className="previewHeadline">YOUR NEXT<br/>BIG STORY</div><div className="previewOverlay" style={{ background: form.overlay_color, opacity: form.overlay_opacity }} /></div></section>
      </div>
    </main>
  );
}
