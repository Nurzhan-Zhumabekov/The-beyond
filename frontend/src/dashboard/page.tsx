"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/auth/login");
  }
  return (
    <main className="resultPage">
      <div className="resultTopbar"><button onClick={signOut} className="backLink">← Sign out</button><div className="resultStatus">Dashboard</div></div>
      <section className="resultHero"><p className="eyebrow">AI CONTENT FACTORY</p><h1>Dashboard</h1><p className="lead">Create branded content, manage projects and review generation history.</p></section>
      <div className="formatGrid">
        <Link href="/projects" className="format selectedFormat"><strong>Projects</strong><small>Open your campaigns and create a new generation.</small></Link>
        <Link href="/history" className="format"><strong>History</strong><small>Review previous generations and costs.</small></Link>
      </div>
    </main>
  );
}
