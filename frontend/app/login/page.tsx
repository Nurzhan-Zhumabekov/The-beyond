"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/api";
import LoadingButton from "@/components/common/LoadingButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      router.push("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="resultPage authPage">
      <section className="card authCard">
        <p className="eyebrow">BEYOND</p>
        <h1 className="authTitle">Welcome back</h1>
        <p className="lead">Sign in to continue to your content workspace.</p>

        <form onSubmit={handleSubmit}>
          <div className="brandGrid oneColumn">
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></label>
          </div>

          {error && <div className="formError" role="alert">{error}</div>}

          <div className="authAction">
            <LoadingButton loading={loading} loadingText="Signing in…" type="submit">Sign in</LoadingButton>
          </div>
        </form>

        <p className="muted authSwitch">No account? <Link href="/register" className="authLink">Create one</Link></p>
      </section>
    </main>
  );
}
