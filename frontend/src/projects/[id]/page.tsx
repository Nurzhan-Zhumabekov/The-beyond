"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { projectIdFromPath, formatDate } from "@/lib/utils";

export default function ProjectPage() {
  const pathname = usePathname();
  const projectId = projectIdFromPath(pathname);
  const { projects, loading } = useProjects();
  const project = projects.find((item) => item.id === projectId);

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/projects" className="backLink">← Projects</Link><div className="resultStatus">Project</div></div>
      <section className="resultHero"><p className="eyebrow">PROJECT</p><h1>{loading ? "Loading…" : project?.name || projectId}</h1><p className="lead">{project?.description || "Manage generation and brand settings for this project."}</p></section>
      <div className="formatGrid">
        <Link href={`/projects/${projectId}/generate`} className="format selectedFormat"><strong>Generate content</strong><small>Create a new media package from text or URL.</small></Link>
        <Link href={`/projects/${projectId}/brandbook`} className="format"><strong>Brandbook</strong><small>Logos, colors, typography and overlay settings.</small></Link>
        <Link href={`/projects/history?project=${projectId}`} className="format"><strong>History</strong><small>Last generation: {formatDate(project?.last_generation_at)}</small></Link>
      </div>
    </main>
  );
}
