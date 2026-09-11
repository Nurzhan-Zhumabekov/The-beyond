"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createProject, getProjects } from "@/services/api";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setCreating(true);
    const project = await createProject({ name: "New Project", description: "New content campaign" });
    setProjects((items) => [...items, project]);
    setCreating(false);
  }

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/login" className="backLink">← Sign out</Link><div className="resultStatus">Projects</div></div>
      <section className="resultHero"><p className="eyebrow">WORKSPACE</p><h1>Projects</h1><p className="lead">Create campaigns, manage brand settings and open generation history.</p></section>
      {loading ? <section className="card">Loading projects…</section> : (
        <div className="formatGrid">
          {projects.map((project) => (
            <div key={project.id} className="format">
              <strong>{project.name}</strong>
              <small>{project.description}</small>
              <small>Last generation: {project.last_generation_at ? new Date(project.last_generation_at).toLocaleString() : "—"}</small>
              <div className="projectActions">
                <Link href={`/projects/${project.id}/generate`} className="secondary">Open</Link>
                <Link href={`/projects/${project.id}/history`} className="secondary">History</Link>
              </div>
            </div>
          ))}
          <button className="format selectedFormat" onClick={handleCreate} disabled={creating}>
            <strong>{creating ? "Creating…" : "+ Create project"}</strong>
            <small>Start a new isolated campaign</small>
          </button>
        </div>
      )}
    </main>
  );
}
