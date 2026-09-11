"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/services/api";
import LoadingButton from "@/components/common/LoadingButton";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password });
      router.push("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="resultPage authPage">
      <section className="card authCard">
        <p className="eyebrow">BEYOND</p>
        <h1 className="authTitle">Create account</h1>
        <p className="lead">Set up your workspace for projects and brand assets.</p>

        <form onSubmit={handleSubmit}>
          <div className="brandGrid oneColumn">
            <label>Name<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" /></label>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></label>
            <label>Confirm password<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" autoComplete="new-password" /></label>
          </div>

          {error && <div className="formError" role="alert">{error}</div>}

          <div className="authAction">
            <LoadingButton loading={loading} loadingText="Creating account…" type="submit">Create account</LoadingButton>
          </div>
        </form>

        <p className="muted authSwitch">Already registered? <Link href="/login" className="authLink">Sign in</Link></p>
      </section>
    </main>
  );
}
