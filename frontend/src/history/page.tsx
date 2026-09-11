"use client";

import Link from "next/link";

export default function HistoryPage() {
  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/dashboard" className="backLink">← Dashboard</Link><div className="resultStatus">History</div></div>
      <section className="resultHero"><p className="eyebrow">GENERATIONS</p><h1>History</h1><p className="lead">Choose a project to open its generation history.</p></section>
      <section className="card"><Link href="/projects" className="generate">Open projects</Link></section>
    </main>
  );
}
