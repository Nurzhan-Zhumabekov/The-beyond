"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const formats = [
  { id: "background", title: "Background Art", description: "Clean AI-generated background without overlays" },
  { id: "square", title: "Poster 1:1", description: "Square branded visual for social media" },
  { id: "wide", title: "Banner 16:9", description: "Horizontal branded banner" },
  { id: "package", title: "Full Media Package", description: "Text, background, poster and banner" },
];

export default function Home() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"text" | "url">("text");
  const [format, setFormat] = useState("package");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    window.setTimeout(() => router.push("/result"), 1200);
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <div>
          <div className="brand">BEYOND</div>
          <p className="muted">AI Content Factory</p>
        </div>
        <nav>
          <Link className="nav active" href="/">Create</Link>
          <Link className="nav" href="/projects">Projects</Link>
          <Link className="nav" href="/history">History</Link>
          <Link className="nav" href="/brandbook">Brandbook</Link>
        </nav>
        <div className="user">Demo workspace</div>
      </aside>

      <section className="content">
        <header>
          <p className="eyebrow">NEW GENERATION</p>
          <h1>Create a content package</h1>
          <p className="lead">Turn an article or your own text into ready-to-review branded content.</p>
        </header>

        <section className="card">
          <div className="sectionTitle"><span>01</span><div><h2>Source</h2><p>What should AI work with?</p></div></div>
          <div className="tabs">
            <button className={sourceType === "text" ? "tab selected" : "tab"} onClick={() => setSourceType("text")}>Text</button>
            <button className={sourceType === "url" ? "tab selected" : "tab"} onClick={() => setSourceType("url")}>URL</button>
          </div>
          {sourceType === "text" ? (
            <textarea defaultValue="AI is changing how modern teams create, adapt and distribute content across multiple platforms." />
          ) : (
            <input className="urlInput" defaultValue="https://example.com/article" />
          )}
        </section>

        <section className="card">
          <div className="sectionTitle"><span>02</span><div><h2>Output</h2><p>Choose what you want to generate.</p></div></div>
          <div className="formatGrid">
            {formats.map((item) => (
              <button key={item.id} onClick={() => setFormat(item.id)} className={format === item.id ? "format selectedFormat" : "format"}>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="card brandCard">
          <div className="sectionTitle"><span>03</span><div><h2>Brandbook</h2><p>Basic visual settings for the generated assets.</p></div></div>
          <div className="brandGrid">
            <label>Primary color<input type="color" defaultValue="#7c5cff" /></label>
            <label>Text color<input type="color" defaultValue="#ffffff" /></label>
            <label>Font<select defaultValue="Inter"><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
            <label>Logo<input type="file" accept="image/png,image/svg+xml" /></label>
          </div>
        </section>

        <div className="actions">
          <span>Nothing is published automatically. You review every result first.</span>
          <button className="generate" disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? "Generating…" : "Generate →"}
          </button>
        </div>
      </section>
    </main>
  );
}
