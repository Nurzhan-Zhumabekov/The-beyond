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
    <main className="resultPage" style={{ maxWidth: 560, paddingTop: 72 }}>
      <section className="card">
        <p className="eyebrow">BEYOND</p><h1 style={{ fontSize: 38 }}>Welcome back</h1>
        <p className="lead">Sign in to continue to your content workspace.</p>
        <form onSubmit={submit}>
          <div className="brandGrid" style={{ gridTemplateColumns: "1fr" }}>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
          </div>
          {error && <div className="errorBox" style={{ marginTop: 14 }}>{error}</div>}
          <div style={{ marginTop: 22 }}><LoadingButton loading={loading} loadingText="Signing in…" type="submit">Sign in</LoadingButton></div>
        </form>
        <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>No account? <Link href="/auth/register" style={{ color: "#fff" }}>Create one</Link></p>
      </section>
    </main>
  );
}
