type Trend = { direction: "up" | "down" | "flat"; label: string };

export function KpiCard({
  label,
  value,
  sublabel,
  trend,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: Trend;
}) {
  return (
    <div className="kpi-card">
      <div className="label">{label}</div>
      <div className="value-row">
        <div className="value">{value}</div>
        {trend ? (
          <span className={`trend ${trend.direction}`}>
            {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "—"} {trend.label}
          </span>
        ) : null}
      </div>
      {sublabel ? <div className="sublabel">{sublabel}</div> : null}
    </div>
  );
}
