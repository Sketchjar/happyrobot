import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import db, { type LoadRow } from "@/lib/db";

export const runtime = "nodejs";

type SearchBody = {
  origin?: string;
  destination?: string;
  equipment_type?: string;
  pickup_after?: string;
  limit?: number;
};

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clauses: string[] = [];
  const params: Record<string, string> = {};

  if (body.origin) {
    clauses.push("LOWER(origin) LIKE @origin");
    params.origin = `%${body.origin.toLowerCase()}%`;
  }
  if (body.destination) {
    clauses.push("LOWER(destination) LIKE @destination");
    params.destination = `%${body.destination.toLowerCase()}%`;
  }
  if (body.equipment_type) {
    clauses.push("LOWER(equipment_type) = @equipment_type");
    params.equipment_type = body.equipment_type.toLowerCase();
  }
  if (body.pickup_after) {
    clauses.push("pickup_datetime >= @pickup_after");
    params.pickup_after = body.pickup_after;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(body.limit ?? 5, 25));
  const sql = `SELECT * FROM loads ${where} ORDER BY pickup_datetime ASC LIMIT ${limit}`;

  const rows = db.prepare(sql).all(params) as LoadRow[];
  return NextResponse.json({ count: rows.length, loads: rows });
}
