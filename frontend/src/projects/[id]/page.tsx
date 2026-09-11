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
    <main className="resultPage projectCanvas">
      <div className="resultTopbar">
        <Link href="/projects" className="backLink">← All projects</Link>
        <div className="projectTopMeta"><span>Creative OS</span><div className="resultStatus">Project live</div></div>
      </div>

      <section className="projectHero">
        <div className="projectHeroCopy">
          <p className="eyebrow">PROJECT / CREATIVE WORKSPACE</p>
          <h1>{loading ? "Loading…" : project?.name || projectId}</h1>
          <p className="lead">{project?.description || "Shape one idea into a complete, unmistakably branded campaign."}</p>
          <div className="projectPulseRow" aria-label="Project capabilities">
            <span><i /> Strategy</span>
            <span><i /> Copy</span>
            <span><i /> Visuals</span>
          </div>
        </div>

        <div className="creativeOrbit" aria-hidden="true">
          <div className="orbitHalo orbitHaloOne" />
          <div className="orbitHalo orbitHaloTwo" />
          <span className="orbitSatellite satelliteOne">COPY</span>
          <span className="orbitSatellite satelliteTwo">BRAND</span>
          <span className="orbitSatellite satelliteThree">VISUAL</span>
          <div className="orbitCore"><span>AI</span><small>STUDIO</small></div>
          <p>IDEA → STORY → IMPACT</p>
        </div>
      </section>

      <section className="projectActionGrid" aria-label="Project tools">
        <Link href={`/projects/${projectId}/generate`} className="creativeAction creativeActionPrimary">
          <span className="actionIndex">01</span>
          <span className="actionGlyph">✦</span>
          <div><p>MAKE SOMETHING NEW</p><h2>Generate<br />content</h2><span>Text, campaign copy and a complete visual direction.</span></div>
          <span className="actionArrow">↗</span>
        </Link>

        <Link href={`/projects/${projectId}/brandbook`} className="creativeAction creativeActionBrand">
          <span className="actionIndex">02</span>
          <span className="actionGlyph">◐</span>
          <div><p>DEFINE YOUR SIGNAL</p><h2>Brand<br />system</h2><span>Color, type, logos and rules that keep every output yours.</span></div>
          <span className="actionArrow">↗</span>
        </Link>

        <Link href={`/projects/history?project=${projectId}`} className="creativeAction creativeActionHistory">
          <span className="actionIndex">03</span>
          <span className="actionGlyph">↺</span>
          <div><p>RETURN TO THE WORK</p><h2>Creative<br />archive</h2><span>Last generation · {formatDate(project?.last_generation_at)}</span></div>
          <span className="actionArrow">↗</span>
        </Link>
      </section>

      <section className="projectMarquee" aria-label="Creative workflow">
        <span>ONE SOURCE</span><i>✦</i><span>THREE CHANNELS</span><i>✦</i><span>ONE BRAND VOICE</span><i>✦</i><span>READY TO SHIP</span>
      </section>
    </main>
  );
}
