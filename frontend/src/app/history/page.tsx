import Link from "next/link";

export default function HistoryPage() {
  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/dashboard" className="backLink">← Dashboard</Link><div className="resultStatus">History</div></div>
      <section className="resultHero"><p className="eyebrow">GENERATIONS</p><h1>Generation history</h1><p className="lead">History is organized per project. Open a project to view, download or reuse its previous generations.</p></section>
      <section className="card"><Link href="/projects" className="generate">Choose project →</Link></section>
    </main>
  );
}
