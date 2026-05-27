import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import db, { type LoadRow } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const { id } = await params;
  const row = db.prepare("SELECT * FROM loads WHERE load_id = ?").get(id) as LoadRow | undefined;
  if (!row) return NextResponse.json({ error: "Load not found" }, { status: 404 });
  return NextResponse.json(row);
}
