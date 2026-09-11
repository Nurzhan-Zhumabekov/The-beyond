"use client";

import Link from "next/link";
import { useState } from "react";

const positions = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

export default function EditorPage() {
  const [ratio, setRatio] = useState<"square" | "wide">("square");
  const [headline, setHeadline] = useState("CREATE BEYOND THE ORDINARY");
  const [logoPosition, setLogoPosition] = useState<(typeof positions)[number]>("top-left");
  const [zoom, setZoom] = useState(100);
  const [textColor, setTextColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#7c5cff");
  const [font, setFont] = useState("Inter");

  return (
    <main className="editorPage">
      <div className="resultTopbar">
        <Link href="/result" className="backLink">← Back to result</Link>
        <div className="resultStatus">Visual editor · Draft</div>
      </div>

      <div className="editorLayout">
        <aside className="editorControls card">
          <p className="eyebrow">EDITOR</p>
          <h2>Customize visual</h2>

          <label className="controlLabel">Format</label>
          <div className="tabs">
            <button className={ratio === "square" ? "tab selected" : "tab"} onClick={() => setRatio("square")}>1:1</button>
            <button className={ratio === "wide" ? "tab selected" : "tab"} onClick={() => setRatio("wide")}>16:9</button>
          </div>

          <label className="controlLabel">Headline</label>
          <textarea value={headline} onChange={(event) => setHeadline(event.target.value)} />

          <label className="controlLabel">Logo position</label>
          <div className="positionGrid">
            {positions.map((position) => (
              <button key={position} onClick={() => setLogoPosition(position)} className={logoPosition === position ? "position activePosition" : "position"}>{position.replace("-", " ")}</button>
            ))}
          </div>

          <label className="controlLabel">Image crop / zoom · {zoom}%</label>
          <input type="range" min="100" max="160" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />

          <div className="editorFields">
            <label>Text color<input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label>
            <label>Accent<input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} /></label>
            <label>Font<select value={font} onChange={(event) => setFont(event.target.value)}><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
          </div>

          <div className="editorButtons">
            <button className="secondary full">Save variation</button>
            <button className="generate full">Export PNG</button>
          </div>
        </aside>

        <section className="canvasArea">
          <div className={`designCanvas ${ratio}`} style={{ color: textColor, fontFamily: font }}>
            <div className="editorBackground" style={{ transform: `scale(${zoom / 100})` }} />
            <div className={`editorLogo ${logoPosition}`}>BEYOND</div>
            <div className="accentBar" style={{ background: accentColor }} />
            <div className="editorHeadline">{headline}</div>
            <div className="canvasHint">Preview only — server-side renderer will create the final file.</div>
          </div>
          <div className="canvasMeta">
            <span>{ratio === "square" ? "1080 × 1080" : "1920 × 1080"}</span>
            <span>Version stays separate from original</span>
          </div>
        </section>
      </div>
    </main>
  );
}
