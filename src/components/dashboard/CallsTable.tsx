"use client";

import { useEffect, useState } from "react";
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

const fmtMoney = (n: number | null) => (n !== null ? `$${n.toFixed(0)}` : "—");

export function CallsTable({ calls }: { calls: CallRow[] }) {
  const [selected, setSelected] = useState<CallRow | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  if (!calls.length) return <div className="empty">No calls logged yet.</div>;

  return (
    <>
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
              <tr
                key={c.id}
                className="row-clickable"
                onClick={() => setSelected(c)}
                title="Click for details"
              >
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
                  {fmtMoney(c.loadboard_rate)}
                </td>
                <td style={{ textAlign: "right" }} className="cell-mono">
                  {fmtMoney(c.final_rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? <CallDetailModal call={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function CallDetailModal({ call, onClose }: { call: CallRow; onClose: () => void }) {
  const delta =
    call.final_rate !== null && call.loadboard_rate !== null
      ? call.final_rate - call.loadboard_rate
      : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>Call #{call.id}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="k">Time</div>
            <div className="v mono">{fmtTime(call.created_at)}</div>

            <div className="k">Outcome</div>
            <div className="v">
              <span className={`pill ${outcomePill(call.outcome)}`}>
                {outcomeLabel[call.outcome] ?? call.outcome}
              </span>
            </div>

            <div className="k">Sentiment</div>
            <div className="v">
              {call.sentiment ? (
                <span className={`pill ${sentimentPill(call.sentiment)}`}>{call.sentiment}</span>
              ) : (
                "—"
              )}
            </div>

            <div className="k">Carrier</div>
            <div className="v">{call.carrier_name ?? "—"}</div>

            <div className="k">MC #</div>
            <div className="v mono">{call.mc_number ?? "—"}</div>

            <div className="k">Load</div>
            <div className="v mono">{call.load_id ?? "—"}</div>

            <div className="k">Loadboard rate</div>
            <div className="v mono">{fmtMoney(call.loadboard_rate)}</div>

            <div className="k">Final rate</div>
            <div className="v mono">
              {fmtMoney(call.final_rate)}
              {delta !== null ? (
                <span
                  style={{
                    marginLeft: 8,
                    color: delta >= 0 ? "var(--success)" : "var(--error)",
                    fontSize: 12,
                  }}
                >
                  ({delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(0)})
                </span>
              ) : null}
            </div>

            <div className="k">Negotiation rounds</div>
            <div className="v">{call.num_rounds}</div>
          </div>

          {call.summary ? (
            <div className="modal-summary">
              <strong>Summary</strong>
              <div style={{ marginTop: 4 }}>{call.summary}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
