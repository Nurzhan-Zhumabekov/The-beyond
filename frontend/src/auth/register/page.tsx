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
    <main className="authPage">
      <section className="authShowcase" aria-label="Beyond product introduction">
        <div className="authMark">BEYOND</div>
        <div className="authPitch">
          <span className="authBadge">CREATE AT THE SPEED OF CULTURE</span>
          <h1>Your brand.<br /><span>Amplified.</span></h1>
          <p>Build a reusable brand system, generate channel-ready content and keep every creative decision in one place.</p>
        </div>
        <div className="authFeatureList">
          <span>Secure workspace</span>
          <span>Reusable brandbook</span>
          <span>Multi-channel output</span>
        </div>
      </section>

      <section className="authFormSide">
        <div className="authCard">
          <header className="authCardHeader">
            <p className="eyebrow">GET STARTED</p>
            <h1>Create account</h1>
            <p className="lead">Set up your creative workspace in a minute.</p>
          </header>
        <form onSubmit={submit}>
          <div className="brandGrid">
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            <label>Confirm password<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" /></label>
          </div>
          {error && <div className="errorBox" style={{ marginTop: 14 }}>{error}</div>}
          <div style={{ marginTop: 22 }}><LoadingButton loading={loading} loadingText="Creating account…" type="submit">Create account</LoadingButton></div>
        </form>
          <p className="authCardFooter">Already registered? <Link href="/auth/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
