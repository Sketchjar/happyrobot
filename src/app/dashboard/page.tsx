import db, { type CallRow } from "@/lib/db";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { OutcomePie } from "@/components/dashboard/OutcomePie";
import { SentimentBar } from "@/components/dashboard/SentimentBar";
import { EquipmentChart } from "@/components/dashboard/EquipmentChart";
import { CallsTable } from "@/components/dashboard/CallsTable";
import { NegotiationFunnel, type FunnelRow } from "@/components/dashboard/NegotiationFunnel";
import { DeclinedLanes, type LaneRow } from "@/components/dashboard/DeclinedLanes";

export const dynamic = "force-dynamic";

type AvgRow = {
  total_calls: number;
  accepted_calls: number;
  avg_rounds: number | null;
  avg_final_rate: number | null;
  avg_loadboard_rate: number | null;
  avg_rate_delta: number | null;
};

type RevenueRow = {
  total_revenue: number | null;
  avg_deal_size: number | null;
  booked_count: number;
};

function loadMetrics() {
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS total_calls,
         SUM(CASE WHEN outcome = 'accepted' THEN 1 ELSE 0 END) AS accepted_calls,
         AVG(num_rounds) AS avg_rounds,
         AVG(final_rate) AS avg_final_rate,
         AVG(loadboard_rate) AS avg_loadboard_rate,
         AVG(final_rate - loadboard_rate) AS avg_rate_delta
       FROM calls`,
    )
    .get() as AvgRow;

  const revenue = db
    .prepare(
      `SELECT
         SUM(final_rate) AS total_revenue,
         AVG(final_rate) AS avg_deal_size,
         COUNT(*) AS booked_count
       FROM calls
       WHERE outcome = 'accepted' AND final_rate IS NOT NULL`,
    )
    .get() as RevenueRow;

  const funnel = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN carrier_name IS NOT NULL THEN 1 ELSE 0 END) AS verified,
         SUM(CASE WHEN load_id IS NOT NULL THEN 1 ELSE 0 END) AS pitched,
         SUM(CASE WHEN num_rounds > 0 THEN 1 ELSE 0 END) AS negotiated,
         SUM(CASE WHEN outcome = 'accepted' THEN 1 ELSE 0 END) AS booked
       FROM calls`,
    )
    .get() as FunnelRow;

  const declinedLanes = db
    .prepare(
      `SELECT
         l.origin AS origin,
         l.destination AS destination,
         COUNT(*) AS total_calls,
         SUM(CASE WHEN c.outcome IN ('rejected', 'abandoned', 'no_match') THEN 1 ELSE 0 END) AS declines
       FROM calls c
       JOIN loads l ON l.load_id = c.load_id
       GROUP BY l.origin, l.destination
       ORDER BY (CAST(SUM(CASE WHEN c.outcome IN ('rejected','abandoned','no_match') THEN 1 ELSE 0 END) AS REAL) / COUNT(*)) DESC,
                COUNT(*) DESC
       LIMIT 5`,
    )
    .all() as LaneRow[];

  const byOutcome = db
    .prepare(`SELECT outcome, COUNT(*) AS n FROM calls GROUP BY outcome`)
    .all() as Array<{ outcome: string; n: number }>;

  const bySentiment = db
    .prepare(`SELECT sentiment, COUNT(*) AS n FROM calls WHERE sentiment IS NOT NULL GROUP BY sentiment`)
    .all() as Array<{ sentiment: string; n: number }>;

  const byEquipment = db
    .prepare(
      `SELECT l.equipment_type AS equipment_type,
              AVG(c.final_rate) AS avg_final_rate,
              AVG(c.loadboard_rate) AS avg_loadboard_rate,
              COUNT(*) AS n
         FROM calls c
         JOIN loads l ON l.load_id = c.load_id
        WHERE c.final_rate IS NOT NULL
        GROUP BY l.equipment_type`,
    )
    .all() as Array<{
      equipment_type: string;
      avg_final_rate: number | null;
      avg_loadboard_rate: number | null;
      n: number;
    }>;

  const recent = db
    .prepare(`SELECT * FROM calls ORDER BY created_at DESC LIMIT 25`)
    .all() as CallRow[];

  return { totals, revenue, funnel, declinedLanes, byOutcome, bySentiment, byEquipment, recent };
}

function fmtUsd(n: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (n === null || n === undefined) return "$0";
  if (opts.compact && n >= 1000) {
    return `$${(n / 1000).toFixed(1)}K`;
  }
  return `$${Math.round(n).toLocaleString()}`;
}

export default function DashboardPage() {
  const { totals, revenue, funnel, declinedLanes, byOutcome, bySentiment, byEquipment, recent } =
    loadMetrics();

  const conversion =
    totals.total_calls > 0 ? ((totals.accepted_calls / totals.total_calls) * 100).toFixed(1) : "0.0";
  const avgDelta = totals.avg_rate_delta;

  const deltaTrend: "up" | "down" | "flat" =
    avgDelta === null || avgDelta === 0 ? "flat" : avgDelta > 0 ? "up" : "down";

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">HR</span>
            <span>HappyRobot · Inbound</span>
          </div>
          <div className="topbar-meta">Carlos Becker · Acme Logistics</div>
        </div>
      </header>

      <main className="container">
        <div className="page-header">
          <div>
            <h1>Inbound Carrier Sales</h1>
            <div className="subtitle">Real-time view of AI-handled carrier calls</div>
          </div>
          <span className="live-pill">
            <span className="live-dot" /> Live · auto-refresh on load
          </span>
        </div>

        <section className="kpi-grid">
          <KpiCard
            label="Revenue Booked"
            value={fmtUsd(revenue.total_revenue, { compact: true })}
            sublabel={
              revenue.booked_count > 0
                ? `${revenue.booked_count} booked · avg ${fmtUsd(revenue.avg_deal_size)}`
                : "Waiting on first booking"
            }
          />
          <KpiCard label="Total Calls" value={totals.total_calls} sublabel="All time" />
          <KpiCard
            label="Conversion Rate"
            value={`${conversion}%`}
            sublabel={`${totals.accepted_calls} of ${totals.total_calls} accepted`}
            trend={
              totals.total_calls > 0
                ? { direction: Number(conversion) >= 50 ? "up" : "flat", label: `${conversion}%` }
                : undefined
            }
          />
          <KpiCard
            label="Avg Negotiation Rounds"
            value={totals.avg_rounds !== null ? totals.avg_rounds.toFixed(2) : "0"}
            sublabel="Lower is better"
          />
          <KpiCard
            label="Margin vs Loadboard"
            value={
              avgDelta !== null
                ? `${avgDelta >= 0 ? "+" : "−"}${fmtUsd(Math.abs(avgDelta))}`
                : "—"
            }
            sublabel={
              totals.avg_final_rate !== null
                ? `Final avg ${fmtUsd(totals.avg_final_rate)}`
                : "Waiting on first booked load"
            }
            trend={
              avgDelta !== null
                ? {
                    direction: deltaTrend,
                    label: `${avgDelta >= 0 ? "+" : "−"}${fmtUsd(Math.abs(avgDelta))}`,
                  }
                : undefined
            }
          />
        </section>

        <section className="chart-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Negotiation Funnel</h2>
              <span className="panel-meta">where deals fall off</span>
            </div>
            <NegotiationFunnel data={funnel} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Top Declined Lanes</h2>
              <span className="panel-meta">action: re-price these</span>
            </div>
            <DeclinedLanes data={declinedLanes} />
          </div>
        </section>

        <section className="chart-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Call Outcomes</h2>
              <span className="panel-meta">{totals.total_calls} total</span>
            </div>
            <OutcomePie data={byOutcome} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Carrier Sentiment</h2>
              <span className="panel-meta">classified post-call</span>
            </div>
            <SentimentBar data={bySentiment} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Rate by Equipment Type</h2>
              <span className="panel-meta">loadboard vs final</span>
            </div>
            <EquipmentChart data={byEquipment} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Recent Calls</h2>
            <span className="panel-meta">Click a row for details · Last {recent.length}</span>
          </div>
          <CallsTable calls={recent} />
        </section>
      </main>

      <footer className="footer">
        <span>HappyRobot FDE POC</span>
        <span>Next.js · SQLite · Fly.io</span>
      </footer>
    </>
  );
}
