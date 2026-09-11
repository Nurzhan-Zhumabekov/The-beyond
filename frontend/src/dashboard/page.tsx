"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/auth/login" className="backLink">← Sign out</Link><div className="resultStatus">Dashboard</div></div>
      <section className="resultHero"><p className="eyebrow">AI CONTENT FACTORY</p><h1>Dashboard</h1><p className="lead">Create branded content, manage projects and review generation history.</p></section>
      <div className="formatGrid">
        <Link href="/projects" className="format selectedFormat"><strong>Projects</strong><small>Open your campaigns and create a new generation.</small></Link>
        <Link href="/history" className="format"><strong>History</strong><small>Review previous generations and costs.</small></Link>
      </div>
    </main>
  );
}
