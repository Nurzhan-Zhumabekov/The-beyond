import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="resultPage" style={{maxWidth:560,paddingTop:90}}>
      <section className="card">
        <p className="eyebrow">BEYOND</p>
        <h1 style={{fontSize:38}}>Welcome back</h1>
        <p className="lead">Sign in to continue to your content workspace.</p>
        <div className="brandGrid" style={{gridTemplateColumns:"1fr"}}>
          <label>Email<input type="email" placeholder="you@example.com" /></label>
          <label>Password<input type="password" placeholder="••••••••" /></label>
        </div>
        <Link href="/projects" className="generate full" style={{marginTop:22}}>Sign in</Link>
        <p className="muted" style={{textAlign:"center",fontSize:13}}>No account? <Link href="/register" style={{color:"#fff"}}>Create one</Link></p>
      </section>
    </main>
  );
}
