"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { formatDate } from "@/lib/utils";

export default function ProjectsPage() {
  const { projects, loading, error, createProject } = useProjects();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try { await createProject(name.trim(), description.trim()); setName(""); setDescription(""); setShowCreate(false); }
    finally { setCreating(false); }
  }

  return (
    <main className="resultPage workspaceCanvas">
      <div className="resultTopbar"><Link href="/dashboard" className="backLink">← Dashboard</Link><Link href="/projects/history" className="secondary">History</Link></div>
      <section className="workspaceHero">
        <div><p className="eyebrow">YOUR CREATIVE UNIVERSE</p><h1>Ideas in<br /><span>motion.</span></h1><p className="lead">Every project is a living system for campaigns, visuals and brand-ready stories.</p></div>
        <div className="workspaceCounter"><strong>{String(projects.length).padStart(2, "0")}</strong><span>active<br />worlds</span></div>
      </section>
      <div className="workspaceToolbar"><p>Select a world or start a new one.</p><button className="generate" onClick={() => setShowCreate((value) => !value)}>{showCreate ? "Close creator" : "+ Create project"}</button></div>
      {showCreate && <section className="card"><form onSubmit={submit}><div className="brandGrid"><label>Project name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="New campaign" /></label><label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short project description" /></label></div><div className="visualActions"><button className="generate" disabled={!name.trim() || creating}>{creating ? "Creating…" : "Create"}</button></div></form></section>}
      {error && <section className="card errorBox">{error}</section>}
      {loading ? <section className="card">Loading projects…</section> : <div className="projectCollection">{projects.map((project, index) => <article key={project.id} className={`projectCard projectCardTone${index % 3}`}><div className="projectCardVisual" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><i /><b>{project.name.slice(0, 2).toUpperCase()}</b></div><div className="projectCardBody"><p className="eyebrow">CREATIVE PROJECT</p><h2>{project.name}</h2><p>{project.description || "A new space for brand-ready ideas."}</p><small>Last activity · {formatDate(project.last_generation_at)}</small><div className="projectActions"><Link href={`/projects/${project.id}`} className="generate">Enter project ↗</Link><Link href={`/projects/history?project=${project.id}`} className="secondary">Archive</Link></div></div></article>)}</div>}
    </main>
  );
}
