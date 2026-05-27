import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import db from "@/lib/db";

export const runtime = "nodejs";

type CountRow = { outcome?: string; sentiment?: string; equipment_type?: string; n: number };
type AvgRow = {
  total_calls: number;
  accepted_calls: number;
  avg_rounds: number | null;
  avg_final_rate: number | null;
  avg_loadboard_rate: number | null;
  avg_rate_delta: number | null;
};

export async function GET(req: Request) {
  const auth = requireApiKey(req);
  if (auth) return auth;

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
    .all() as CountRow[];

  const bySentiment = db
    .prepare(`SELECT sentiment, COUNT(*) AS n FROM calls WHERE sentiment IS NOT NULL GROUP BY sentiment`)
    .all() as CountRow[];

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
    .all();

  const conversionRate =
    totals.total_calls > 0 ? (totals.accepted_calls / totals.total_calls) * 100 : 0;

  return NextResponse.json({
    totals: {
      total_calls: totals.total_calls,
      accepted_calls: totals.accepted_calls,
      conversion_rate_pct: Number(conversionRate.toFixed(1)),
      avg_rounds: totals.avg_rounds !== null ? Number(totals.avg_rounds.toFixed(2)) : 0,
      avg_final_rate: totals.avg_final_rate !== null ? Number(totals.avg_final_rate.toFixed(0)) : null,
      avg_rate_delta: totals.avg_rate_delta !== null ? Number(totals.avg_rate_delta.toFixed(0)) : null,
    },
    by_outcome: byOutcome,
    by_sentiment: bySentiment,
    by_equipment: byEquipment,
  });
}
