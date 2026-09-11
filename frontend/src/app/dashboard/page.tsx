import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="resultPage">
      <section className="resultHero"><p className="eyebrow">DASHBOARD</p><h1>AI Content Factory</h1><p className="lead">Create branded content packages, review results and manage project history.</p></section>
      <div className="formatGrid">
        <Link href="/projects" className="format selectedFormat"><strong>Projects</strong><small>Open or create a campaign workspace.</small></Link>
        <Link href="/history" className="format"><strong>History</strong><small>Review previous generations.</small></Link>
      </div>
    </main>
  );
}
