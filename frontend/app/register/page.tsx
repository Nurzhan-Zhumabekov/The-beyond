import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="resultPage" style={{maxWidth:560,paddingTop:70}}>
      <section className="card">
        <p className="eyebrow">BEYOND</p>
        <h1 style={{fontSize:38}}>Create account</h1>
        <p className="lead">Set up your workspace for projects and brand assets.</p>
        <div className="brandGrid" style={{gridTemplateColumns:"1fr"}}>
          <label>Name<input type="text" placeholder="Your name" /></label>
          <label>Email<input type="email" placeholder="you@example.com" /></label>
          <label>Password<input type="password" placeholder="At least 8 characters" /></label>
        </div>
        <Link href="/projects" className="generate full" style={{marginTop:22}}>Create account</Link>
        <p className="muted" style={{textAlign:"center",fontSize:13}}>Already registered? <Link href="/login" style={{color:"#fff"}}>Sign in</Link></p>
      </section>
    </main>
  );
}
