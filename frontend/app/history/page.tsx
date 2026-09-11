import Link from "next/link";

export default function HistoryPage() {
  const items = [
    ["AI is changing modern content production", "Approved", "V3"],
    ["Product launch announcement", "Draft", "V2"],
    ["Weekly industry digest", "Draft", "V1"],
  ];

  return (
    <main className="resultPage">
      <div className="resultTopbar"><Link href="/" className="backLink">← Back to generator</Link><div className="resultStatus">History</div></div>
      <section className="resultHero"><p className="eyebrow">GENERATIONS</p><h1>History</h1><p className="lead">Open previous results without losing older variations.</p></section>
      <div className="card">
        {items.map(([title, status, version], index) => (
          <Link href="/result" key={title} className="historyRow">
            <div><strong>{title}</strong><small>Generation #{24 - index}</small></div>
            <span>{version}</span><span>{status}</span><span>Open →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
