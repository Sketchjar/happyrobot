import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import db, { type CallRow, type LoadRow } from "@/lib/db";

export const runtime = "nodejs";

type LogCallBody = {
  mc_number?: string;
  carrier_name?: string;
  load_id?: string;
  outcome: "accepted" | "rejected" | "no_match" | "ineligible" | "abandoned";
  sentiment?: "positive" | "neutral" | "negative";
  final_rate?: number;
  num_rounds?: number;
  summary?: string;
};

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  let body: LogCallBody;
  try {
    body = (await req.json()) as LogCallBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.outcome) {
    return NextResponse.json({ error: "outcome is required" }, { status: 400 });
  }

  let loadboardRate: number | null = null;
  if (body.load_id) {
    const load = db.prepare("SELECT loadboard_rate FROM loads WHERE load_id = ?").get(body.load_id) as
      | Pick<LoadRow, "loadboard_rate">
      | undefined;
    loadboardRate = load?.loadboard_rate ?? null;
  }

  const result = db
    .prepare(
      `INSERT INTO calls (mc_number, carrier_name, load_id, outcome, sentiment, final_rate, loadboard_rate, num_rounds, summary)
       VALUES (@mc_number, @carrier_name, @load_id, @outcome, @sentiment, @final_rate, @loadboard_rate, @num_rounds, @summary)`,
    )
    .run({
      mc_number: body.mc_number ?? null,
      carrier_name: body.carrier_name ?? null,
      load_id: body.load_id ?? null,
      outcome: body.outcome,
      sentiment: body.sentiment ?? null,
      final_rate: body.final_rate ?? null,
      loadboard_rate: loadboardRate,
      num_rounds: body.num_rounds ?? 0,
      summary: body.summary ?? null,
    });

  return NextResponse.json({ id: result.lastInsertRowid, ok: true }, { status: 201 });
}

export async function GET(req: Request) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 50), 500));

  const rows = db
    .prepare(`SELECT * FROM calls ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as CallRow[];

  return NextResponse.json({ count: rows.length, calls: rows });
}
