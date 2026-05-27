import db, { type CallRow } from "@/lib/db";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { OutcomePie } from "@/components/dashboard/OutcomePie";
import { SentimentBar } from "@/components/dashboard/SentimentBar";
import { EquipmentChart } from "@/components/dashboard/EquipmentChart";
import { CallsTable } from "@/components/dashboard/CallsTable";

export const dynamic = "force-dynamic";

type AvgRow = {
  total_calls: number;
  accepted_calls: number;
  avg_rounds: number | null;
  avg_final_rate: number | null;
  avg_loadboard_rate: number | null;
  avg_rate_delta: number | null;
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

  return { totals, byOutcome, bySentiment, byEquipment, recent };
}

export default function DashboardPage() {
  const { totals, byOutcome, bySentiment, byEquipment, recent } = loadMetrics();
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
          <KpiCard label="Total Calls" value={totals.total_calls} sublabel="All time" />
          <KpiCard
            label="Conversion Rate"
            value={`${conversion}%`}
            sublabel={`${totals.accepted_calls} accepted`}
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
                ? `${avgDelta >= 0 ? "+" : "−"}$${Math.abs(avgDelta).toFixed(0)}`
                : "—"
            }
            sublabel={
              totals.avg_final_rate !== null
                ? `Final avg $${totals.avg_final_rate.toFixed(0)}`
                : "Waiting on first booked load"
            }
            trend={
              avgDelta !== null
                ? { direction: deltaTrend, label: `${avgDelta >= 0 ? "+" : "−"}$${Math.abs(avgDelta).toFixed(0)}` }
                : undefined
            }
          />
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
            <span className="panel-meta">Last {recent.length}</span>
          </div>
          <CallsTable calls={recent} />
        </section>
      </main>

      <footer className="footer">
        <span>HappyRobot FDE POC · Built by Claude &amp; Gaurav</span>
        <span>Next.js · SQLite · Fly.io</span>
      </footer>
    </>
  );
}
