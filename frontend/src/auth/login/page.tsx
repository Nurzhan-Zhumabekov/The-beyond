"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { login } from "@/lib/api";
import LoadingButton from "@/components/ui/LoadingButton";
import { navigate } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) return setError("Fill in all required fields.");
    setLoading(true);
    try { await login({ email, password }); navigate("/projects"); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); }
    finally { setLoading(false); }
  }

  return (
    <main className="authPage">
      <section className="authShowcase" aria-label="Beyond product introduction">
        <div className="authMark">BEYOND</div>
        <div className="authPitch">
          <span className="authBadge">AI CONTENT FACTORY</span>
          <h1>One idea.<br /><span>Every format.</span></h1>
          <p>Turn raw material into campaign-ready copy and branded visuals from one focused workspace.</p>
        </div>
        <div className="authFeatureList">
          <span>Brand consistent</span>
          <span>Human reviewed</span>
          <span>Ready to export</span>
        </div>
      </section>

      <section className="authFormSide">
        <div className="authCard">
          <header className="authCardHeader">
            <p className="eyebrow">WELCOME BACK</p>
            <h1>Sign in</h1>
            <p className="lead">Continue to your creative workspace.</p>
          </header>
        <form onSubmit={submit}>
          <div className="brandGrid">
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
          </div>
          {error && <div className="errorBox" style={{ marginTop: 14 }}>{error}</div>}
          <div style={{ marginTop: 22 }}><LoadingButton loading={loading} loadingText="Signing in…" type="submit">Sign in</LoadingButton></div>
        </form>
          <p className="authCardFooter">No account? <Link href="/auth/register">Create one</Link></p>
        </div>
      </section>
    </main>
  );
}
