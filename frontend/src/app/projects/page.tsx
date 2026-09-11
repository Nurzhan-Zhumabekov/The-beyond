"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearAccessToken } from "@/lib/api";
import { projectsService } from "@/services/projects";
import { useProjects } from "@/hooks/useProjects";
import { formatDate } from "@/lib/utils";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, error, setProjects } = useProjects();
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      setFormError("Project name is required.");
      return;
    }
    setCreating(true);
    setFormError("");
    try {
      const project = await projectsService.create({ name: name.trim(), description: description.trim() });
      setProjects((items) => [...items, project]);
      setShowCreate(false);
      setName("");
      setDescription("");
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to create project.");
    } finally {
      setCreating(false);
    }
  }

  function signOut() {
    clearAccessToken();
    router.push("/login");
  }

  return (
    <main className="resultPage">
      <div className="resultTopbar"><button className="backLink linkButton" onClick={signOut}>← Sign out</button><div className="resultStatus">Projects</div></div>
      <section className="resultHero"><p className="eyebrow">WORKSPACE</p><h1>Projects</h1><p className="lead">Create campaigns, manage brand settings and open generation history.</p></section>

      {error && <section className="card errorBox">{error}</section>}
      {loading ? <section className="card">Loading projects…</section> : (
        <div className="formatGrid">
          {projects.map((project) => (
            <div key={project.id} className="format">
              <strong>{project.name}</strong>
              <small>{project.description || "No description"}</small>
              <small>Last generation: {formatDate(project.last_generation_at)}</small>
              <div className="projectActions">
                <Link href={`/projects/${project.id}`} className="secondary">Open</Link>
                <Link href={`/projects/${project.id}/history`} className="secondary">History</Link>
              </div>
            </div>
          ))}
          <button className="format selectedFormat" onClick={() => setShowCreate(true)}><strong>+ Create project</strong><small>Start a new isolated campaign</small></button>
        </div>
      )}

      {showCreate && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => !creating && setShowCreate(false)}>
          <section className="card modalCard" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">NEW PROJECT</p>
            <h2 id="create-project-title">Create project</h2>
            <div className="brandGrid oneColumn">
              <label>Project name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product launch" autoFocus /></label>
              <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short campaign description" /></label>
            </div>
            {formError && <div className="formError">{formError}</div>}
            <div className="visualActions">
              <button className="secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button className="generate" onClick={handleCreate} disabled={creating}>{creating ? "Creating…" : "Create project"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
