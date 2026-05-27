import type { CallRow } from "@/lib/db";

const sentimentPill = (s: string | null) => {
  if (s === "positive") return "success";
  if (s === "negative") return "error";
  if (s === "neutral") return "info";
  return "neutral";
};

const outcomePill = (o: string) => {
  if (o === "accepted") return "success";
  if (o === "rejected" || o === "ineligible") return "error";
  if (o === "no_match" || o === "abandoned") return "warning";
  return "neutral";
};

const outcomeLabel: Record<string, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  no_match: "No match",
  ineligible: "Ineligible",
  abandoned: "Abandoned",
};

const fmtTime = (iso: string) => {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function CallsTable({ calls }: { calls: CallRow[] }) {
  if (!calls.length) return <div className="empty">No calls logged yet.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>MC</th>
            <th>Carrier</th>
            <th>Load</th>
            <th>Outcome</th>
            <th>Sentiment</th>
            <th style={{ textAlign: "right" }}>Rounds</th>
            <th style={{ textAlign: "right" }}>Loadboard</th>
            <th style={{ textAlign: "right" }}>Final</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id}>
              <td className="cell-mono">{fmtTime(c.created_at)}</td>
              <td className="cell-mono">{c.mc_number ?? "—"}</td>
              <td>{c.carrier_name ?? "—"}</td>
              <td className="cell-mono">{c.load_id ?? "—"}</td>
              <td>
                <span className={`pill ${outcomePill(c.outcome)}`}>
                  {outcomeLabel[c.outcome] ?? c.outcome}
                </span>
              </td>
              <td>
                {c.sentiment ? (
                  <span className={`pill ${sentimentPill(c.sentiment)}`}>{c.sentiment}</span>
                ) : (
                  "—"
                )}
              </td>
              <td style={{ textAlign: "right" }}>{c.num_rounds}</td>
              <td style={{ textAlign: "right" }} className="cell-mono">
                {c.loadboard_rate !== null ? `$${c.loadboard_rate.toFixed(0)}` : "—"}
              </td>
              <td style={{ textAlign: "right" }} className="cell-mono">
                {c.final_rate !== null ? `$${c.final_rate.toFixed(0)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
