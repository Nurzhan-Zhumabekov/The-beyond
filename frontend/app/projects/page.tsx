import Link from "next/link";

export default function ProjectsPage() {
  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/" className="backLink">← Back to generator</Link><div className="resultStatus">Projects</div></div>
      <section className="resultHero"><p className="eyebrow">WORKSPACE</p><h1>Projects</h1><p className="lead">Keep campaigns, brand settings and generations separated.</p></section>
      <div className="formatGrid">
        <Link href="/" className="format"><strong>Demo Campaign</strong><small>3 generations · updated today</small></Link>
        <Link href="/" className="format"><strong>Product Launch</strong><small>1 generation · draft</small></Link>
        <Link href="/" className="format selectedFormat"><strong>+ Create project</strong><small>Start a new isolated campaign</small></Link>
      </div>
    </main>
  );
}
