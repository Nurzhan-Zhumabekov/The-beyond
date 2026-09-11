"use client";

import Link from "next/link";
import { useState } from "react";

const mockPosts = {
  telegram: "AI is changing the way teams create content. One source can now become a complete package for multiple channels — faster, more consistently and with brand rules intact.",
  instagram: "One idea. Multiple formats. Less manual work. AI Content Factory turns source material into ready-to-review social content and branded visuals.",
  linkedin: "Content production is moving from isolated manual tasks to coordinated AI-assisted workflows. A single source can be transformed into platform-specific copy and branded visual assets while preserving human review before publication.",
};

export default function ResultPage() {
  const [tab, setTab] = useState<"telegram" | "instagram" | "linkedin">("telegram");
  const [visual, setVisual] = useState<"background" | "poster" | "banner">("poster");
  const [showRefine, setShowRefine] = useState(false);
  const [version, setVersion] = useState(1);

  const refine = () => {
    setVersion((value) => value + 1);
    setShowRefine(false);
  };

  return (
    <main className="resultPage">
      <div className="resultTopbar">
        <Link href="/" className="backLink">← Back to generator</Link>
        <div className="resultStatus">Draft · Version {version}</div>
      </div>

      <section className="resultHero">
        <p className="eyebrow">GENERATION COMPLETE</p>
        <h1>AI is changing modern content production</h1>
        <p className="lead">Review the copy and visuals before approving anything.</p>
      </section>

      <div className="resultLayout">
        <section className="resultMain">
          <div className="card">
            <div className="sectionTitle"><span>01</span><div><h2>Generated copy</h2><p>Edit or refine only the part you want.</p></div></div>
            <div className="tabs">
              {(["telegram", "instagram", "linkedin"] as const).map((item) => (
                <button key={item} className={tab === item ? "tab selected" : "tab"} onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</button>
              ))}
            </div>
            <textarea className="resultText" value={mockPosts[tab]} readOnly />
            <div className="points">
              <strong>Key points</strong>
              <ul><li>One source becomes multiple platform-ready formats</li><li>Brand consistency is preserved</li><li>Human review happens before publication</li></ul>
            </div>
          </div>

          <div className="card">
            <div className="sectionTitle"><span>02</span><div><h2>Visuals</h2><p>Background art, branded poster and banner are kept separately.</p></div></div>
            <div className="tabs">
              <button className={visual === "background" ? "tab selected" : "tab"} onClick={() => setVisual("background")}>Background Art</button>
              <button className={visual === "poster" ? "tab selected" : "tab"} onClick={() => setVisual("poster")}>Poster 1:1</button>
              <button className={visual === "banner" ? "tab selected" : "tab"} onClick={() => setVisual("banner")}>Banner 16:9</button>
            </div>

            <div className={`visualPreview ${visual}`}>
              <div className="previewGlow" />
              {visual !== "background" && <div className="previewLogo">BEYOND</div>}
              {visual !== "background" && <div className="previewHeadline">CREATE<br/>BEYOND<br/>THE ORDINARY</div>}
              {visual === "background" && <div className="artLabel">AI GENERATED BACKGROUND ART</div>}
            </div>
            <div className="visualActions">
              <button className="secondary">Download preview</button>
              <Link href="/editor" className="generate">Open editor</Link>
            </div>
          </div>
        </section>

        <aside className="reviewPanel card">
          <p className="eyebrow">REVIEW</p>
          <h2>Do you like this version?</h2>
          <p className="muted">Nothing will be published automatically.</p>
          <button className="approve">✓ Approve version</button>
          <button className="secondary full" onClick={() => setShowRefine((value) => !value)}>✦ Refine selected parts</button>
          <button className="secondary full" onClick={() => setVersion((value) => value + 1)}>↻ Generate another version</button>

          {showRefine && (
            <div className="refineBox">
              <strong>What should change?</strong>
              <label><input type="checkbox" /> Headline</label>
              <label><input type="checkbox" /> Social copy</label>
              <label><input type="checkbox" /> Background art</label>
              <label><input type="checkbox" /> Poster</label>
              <label><input type="checkbox" /> Banner</label>
              <textarea placeholder="Example: make the visual more minimal, use a darker background and shorten the headline." />
              <button className="generate full" onClick={refine}>Generate refined version</button>
            </div>
          )}

          <div className="versionBox"><span>Saved versions</span><strong>V1 — V{version}</strong></div>
        </aside>
      </div>
    </main>
  );
}
