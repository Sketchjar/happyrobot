type Row = { sentiment: string; n: number };

export function SentimentBar({ data }: { data: Row[] }) {
  if (!data.length) return <div className="empty">No sentiment data yet.</div>;

  const total = data.reduce((s, d) => s + d.n, 0);
  const get = (k: string) => data.find((d) => d.sentiment === k)?.n ?? 0;
  const positive = get("positive");
  const neutral = get("neutral");
  const negative = get("negative");
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="sentiment-stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="t-metric-lg">{total}</span>
        <span style={{ color: "var(--slate-text)", fontSize: 12 }}>
          {pct(positive).toFixed(0)}% positive · {pct(neutral).toFixed(0)}% neutral · {pct(negative).toFixed(0)}% negative
        </span>
      </div>

      <div className="sentiment-bar" aria-label="Sentiment distribution">
        <span className="pos" style={{ width: `${pct(positive)}%` }} />
        <span className="neu" style={{ width: `${pct(neutral)}%` }} />
        <span className="neg" style={{ width: `${pct(negative)}%` }} />
      </div>

      <div className="sentiment-legend">
        <span className="item">
          <span className="dot pos" /> Positive · {positive}
        </span>
        <span className="item">
          <span className="dot neu" /> Neutral · {neutral}
        </span>
        <span className="item">
          <span className="dot neg" /> Negative · {negative}
        </span>
      </div>
    </div>
  );
}
