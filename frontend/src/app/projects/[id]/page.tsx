import Link from "next/link";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/projects" className="backLink">← Projects</Link><div className="resultStatus">Project {id}</div></div>
      <section className="resultHero"><p className="eyebrow">PROJECT</p><h1>Project workspace</h1><p className="lead">Generate content, adjust brand rules and review previous outputs.</p></section>
      <div className="formatGrid">
        <Link href={`/projects/${id}/generate`} className="format selectedFormat"><strong>Generate</strong><small>Create a new branded content package.</small></Link>
        <Link href={`/projects/${id}/brandbook`} className="format"><strong>Brandbook</strong><small>Manage logos, colors, fonts and overlay settings.</small></Link>
        <Link href={`/projects/${id}/history`} className="format"><strong>History</strong><small>Open, download or reuse previous generations.</small></Link>
      </div>
    </main>
  );
}
