"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { register } from "@/lib/api";
import LoadingButton from "@/components/ui/LoadingButton";
import { navigate } from "@/lib/utils";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password || !confirmPassword) return setError("Fill in all required fields.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try { await register({ name, email, password }); navigate("/projects"); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to create account."); }
    finally { setLoading(false); }
  }

  return (
    <main className="resultPage" style={{ maxWidth: 560, paddingTop: 58 }}>
      <section className="card">
        <p className="eyebrow">BEYOND</p><h1 style={{ fontSize: 38 }}>Create account</h1>
        <p className="lead">Create your workspace for projects and brand assets.</p>
        <form onSubmit={submit}>
          <div className="brandGrid" style={{ gridTemplateColumns: "1fr" }}>
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            <label>Confirm password<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" /></label>
          </div>
          {error && <div className="errorBox" style={{ marginTop: 14 }}>{error}</div>}
          <div style={{ marginTop: 22 }}><LoadingButton loading={loading} loadingText="Creating account…" type="submit">Create account</LoadingButton></div>
        </form>
        <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>Already registered? <Link href="/auth/login" style={{ color: "#fff" }}>Sign in</Link></p>
      </section>
    </main>
  );
}
