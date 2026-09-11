"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { updateAsset } from "@/services/api";

const positions = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

export default function AssetEditorPage() {
  const params = useParams<{ assetId: string }>();
  const [ratio, setRatio] = useState<"1:1" | "16:9">("1:1");
  const [headline, setHeadline] = useState("CREATE BEYOND THE ORDINARY");
  const [additionalText, setAdditionalText] = useState("AI Content Factory");
  const [textColor, setTextColor] = useState("#ffffff");
  const [font, setFont] = useState("Inter");
  const [fontSize, setFontSize] = useState(64);
  const [align, setAlign] = useState<"left" | "center" | "right">("left");
  const [logoPosition, setLogoPosition] = useState<(typeof positions)[number]>("top-right");
  const [logoScale, setLogoScale] = useState(0.8);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [backgroundScale, setBackgroundScale] = useState(1.1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveVariation() {
    setSaving(true); setSaved(false);
    await updateAsset({ asset_id: params.assetId, title: headline, additional_text: additionalText, text_color: textColor, font, font_size: fontSize, text_align: align, logo_position: logoPosition, logo_scale: logoScale, overlay_opacity: overlayOpacity, background_scale: backgroundScale, format: ratio });
    setSaving(false); setSaved(true);
  }

  return (
    <main className="editorPage">
      <div className="resultTopbar"><Link href="/result" className="backLink">← Back to result</Link><div className="resultStatus">Asset {params.assetId}</div></div>
      <div className="editorLayout">
        <aside className="editorControls card">
          <p className="eyebrow">EDITOR</p><h2>Customize visual</h2>
          <label className="controlLabel">Format</label><div className="tabs"><button className={ratio === "1:1" ? "tab selected" : "tab"} onClick={() => setRatio("1:1")}>1:1</button><button className={ratio === "16:9" ? "tab selected" : "tab"} onClick={() => setRatio("16:9")}>16:9</button></div>
          <label className="controlLabel">Headline</label><textarea value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <label className="controlLabel">Additional text</label><textarea value={additionalText} onChange={(e) => setAdditionalText(e.target.value)} />
          <div className="editorFields">
            <label>Text color<input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} /></label>
            <label>Font<select value={font} onChange={(e) => setFont(e.target.value)}><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
            <label>Text size · {fontSize}px<input type="range" min="28" max="96" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} /></label>
            <label>Text alignment<select value={align} onChange={(e) => setAlign(e.target.value as typeof align)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <label>Logo scale · {logoScale.toFixed(1)}<input type="range" min="0.4" max="1.6" step="0.1" value={logoScale} onChange={(e) => setLogoScale(Number(e.target.value))} /></label>
            <label>Overlay opacity · {Math.round(overlayOpacity * 100)}%<input type="range" min="0" max="1" step="0.05" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} /></label>
            <label>Background scale · {backgroundScale.toFixed(1)}×<input type="range" min="1" max="1.8" step="0.05" value={backgroundScale} onChange={(e) => setBackgroundScale(Number(e.target.value))} /></label>
          </div>
          <label className="controlLabel">Logo position</label><div className="positionGrid">{positions.map((position) => <button key={position} className={logoPosition === position ? "position activePosition" : "position"} onClick={() => setLogoPosition(position)}>{position.replace("-", " ")}</button>)}</div>
          <div className="editorButtons"><button className="generate full" onClick={saveVariation} disabled={saving}>{saving ? "Saving…" : "Save variation"}</button>{saved && <span>Variation saved</span>}</div>
        </aside>

        <section className="canvasArea">
          <div className={`designCanvas ${ratio === "1:1" ? "square" : "wide"}`} style={{ color: textColor, fontFamily: font }}>
            <div className="editorBackground" style={{ transform: `scale(${backgroundScale})` }} />
            <div className="previewOverlay" style={{ opacity: overlayOpacity }} />
            <div className={`editorLogo ${logoPosition}`} style={{ transform: `scale(${logoScale})` }}>BEYOND</div>
            <div className="editorHeadline" style={{ fontSize, textAlign: align }}>{headline}<small className="editorSubtext">{additionalText}</small></div>
            <div className="canvasHint">Preview controls only — final rendering is done by visual-engine service.</div>
          </div>
          <div className="canvasMeta"><span>{ratio === "1:1" ? "1080 × 1080" : "1920 × 1080"}</span><span>Original asset remains unchanged</span></div>
        </section>
      </div>
    </main>
  );
}
