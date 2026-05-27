export type FunnelRow = {
  total: number;
  verified: number;
  pitched: number;
  negotiated: number;
  booked: number;
};

export function NegotiationFunnel({ data }: { data: FunnelRow }) {
  const steps = [
    { name: "Calls received", value: data.total },
    { name: "MC verified", value: data.verified },
    { name: "Load pitched", value: data.pitched },
    { name: "Entered negotiation", value: data.negotiated },
    { name: "Booked", value: data.booked },
  ];
  const max = Math.max(1, data.total);

  if (!data.total) {
    return <div className="empty">No calls yet — funnel will populate once carriers call in.</div>;
  }

  return (
    <div className="funnel">
      {steps.map((s, i) => {
        const widthPct = (s.value / max) * 100;
        const prev = i === 0 ? null : steps[i - 1].value;
        const dropPct = prev && prev > 0 ? ((prev - s.value) / prev) * 100 : 0;
        return (
          <div key={s.name} className="funnel-step">
            <div className="name">{s.name}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${widthPct}%` }}>
                {s.value}
              </div>
            </div>
            <div className={`pct ${i > 0 && dropPct > 0 ? "drop" : ""}`}>
              {i === 0 ? "—" : `${dropPct >= 0 ? "−" : "+"}${Math.abs(dropPct).toFixed(0)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
