import Link from "next/link";

export default function BrandbookPage() {
  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/" className="backLink">← Back to generator</Link><div className="resultStatus">Brandbook</div></div>
      <section className="resultHero"><p className="eyebrow">BRAND SYSTEM</p><h1>Brandbook</h1><p className="lead">These settings will be reused across project generations.</p></section>
      <section className="card brandCard">
        <div className="brandGrid">
          <label>Primary color<input type="color" defaultValue="#7c5cff" /></label>
          <label>Text color<input type="color" defaultValue="#ffffff" /></label>
          <label>Headline font<select defaultValue="Inter"><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
          <label>Body font<select defaultValue="Inter"><option>Inter</option><option>Arial</option><option>Georgia</option></select></label>
          <label>Light-background logo<input type="file" accept="image/png,image/svg+xml" /></label>
          <label>Dark-background logo<input type="file" accept="image/png,image/svg+xml" /></label>
        </div>
        <div className="visualActions"><button className="generate">Save brandbook</button></div>
      </section>
    </main>
  );
}
