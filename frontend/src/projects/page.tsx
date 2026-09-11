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
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/dashboard" className="backLink">← Dashboard</Link><Link href="/projects/history" className="secondary">History</Link></div>
      <section className="resultHero"><p className="eyebrow">WORKSPACE</p><h1>Projects</h1><p className="lead">Create campaigns, manage brand settings and open generation history.</p></section>
      <div className="visualActions" style={{ justifyContent: "flex-start", marginBottom: 18 }}><button className="generate" onClick={() => setShowCreate((value) => !value)}>+ Create project</button></div>
      {showCreate && <section className="card"><form onSubmit={submit}><div className="brandGrid"><label>Project name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="New campaign" /></label><label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short project description" /></label></div><div className="visualActions"><button className="generate" disabled={!name.trim() || creating}>{creating ? "Creating…" : "Create"}</button></div></form></section>}
      {error && <section className="card errorBox">{error}</section>}
      {loading ? <section className="card">Loading projects…</section> : <div className="formatGrid">{projects.map((project) => <div key={project.id} className="format"><strong>{project.name}</strong><small>{project.description}</small><small>Last generation: {formatDate(project.last_generation_at)}</small><div className="projectActions"><Link href={`/projects/${project.id}`} className="secondary">Open</Link><Link href={`/projects/history?project=${project.id}`} className="secondary">History</Link></div></div>)}</div>}
    </main>
  );
}
