"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { useBrandbook } from "@/hooks/useBrandbook";
import { projectIdFromPath } from "@/lib/utils";
import type { Brandbook } from "@/types";

export default function BrandbookPage() {
  const pathname = usePathname();
  const projectId = projectIdFromPath(pathname);
  const { brandbook, setBrandbook, loading, saving, error, save } = useBrandbook(projectId);
  const [saved, setSaved] = useState(false);

  if (loading || !brandbook) return <main className="resultPage"><section className="card">Loading brandbook…</section></main>;

  const patch = <K extends keyof Brandbook>(key: K, value: Brandbook[K]) => setBrandbook((current) => current ? { ...current, [key]: value } : current);

  async function logoChanged(key: "light_logo_url" | "dark_logo_url", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    form.set("variant", key === "light_logo_url" ? "light" : "dark");
    const response = await fetch(`/api/projects/${projectId}/brandbook/logo`, { method: "POST", body: form, credentials: "include" });
    if (!response.ok) return;
    const { path } = await response.json() as { path: string };
    patch(key, URL.createObjectURL(file));
    patch(key === "light_logo_url" ? "light_logo_path" : "dark_logo_path", path);
  }

  async function submit() {
    setSaved(false);
    await save(brandbook!);
    setSaved(true);
  }

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href={`/projects/${projectId}`} className="backLink">← Project</Link><div className="resultStatus">Brandbook</div></div>
      <section className="resultHero"><p className="eyebrow">BRAND SYSTEM</p><h1>Brandbook</h1><p className="lead">These settings are reused in every generation for this project.</p></section>
      {error && <section className="card errorBox">{error}</section>}
      <div className="brandbookLayout">
        <section className="card brandGrid">
          <label>Brand name<input value={brandbook.brand_name} onChange={(e) => patch("brand_name", e.target.value)} /></label>
          <label>Primary color<input type="color" value={brandbook.primary_color} onChange={(e) => patch("primary_color", e.target.value)} /></label>
          <label>Text color<input type="color" value={brandbook.text_color} onChange={(e) => patch("text_color", e.target.value)} /></label>
          <label>Overlay color<input type="color" value={brandbook.overlay_color} onChange={(e) => patch("overlay_color", e.target.value)} /></label>
          <label>Overlay opacity · {Math.round(brandbook.overlay_opacity * 100)}%<input type="range" min="0" max="1" step="0.05" value={brandbook.overlay_opacity} onChange={(e) => patch("overlay_opacity", Number(e.target.value))} /></label>
          <label>Heading font<select value={brandbook.heading_font} onChange={(e) => patch("heading_font", e.target.value)}><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
          <label>Body font<select value={brandbook.body_font} onChange={(e) => patch("body_font", e.target.value)}><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
          <label>Light logo<input type="file" accept="image/png,image/svg+xml" onChange={(e) => logoChanged("light_logo_url", e)} /></label>
          <label>Dark logo<input type="file" accept="image/png,image/svg+xml" onChange={(e) => logoChanged("dark_logo_url", e)} /></label>
          <div className="visualActions"><button className="generate" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Save brandbook"}</button>{saved && <span>Saved ✓</span>}</div>
        </section>
        <section className="card brandPreviewCard"><p className="eyebrow">PREVIEW</p><div className="brandPreview" style={{ background: brandbook.primary_color, color: brandbook.text_color, fontFamily: brandbook.heading_font }}><div className="previewLogo">{brandbook.brand_name || "BRAND"}</div><div className="previewHeadline">YOUR NEXT<br/>BIG STORY</div><div className="previewOverlay" style={{ background: brandbook.overlay_color, opacity: brandbook.overlay_opacity }} /></div></section>
      </div>
    </main>
  );
}
