import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import db, { type LoadRow } from "@/lib/db";
import { evaluateOffer } from "@/lib/negotiate";

export const runtime = "nodejs";

type NegotiateBody = {
  load_id: string;
  counter_offer: number;
  round: number;
  previous_counter?: number;
};

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  let body: NegotiateBody;
  try {
    body = (await req.json()) as NegotiateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.load_id || typeof body.counter_offer !== "number" || typeof body.round !== "number") {
    return NextResponse.json(
      { error: "load_id, counter_offer (number), and round (number) are required" },
      { status: 400 },
    );
  }

  const load = db.prepare("SELECT * FROM loads WHERE load_id = ?").get(body.load_id) as LoadRow | undefined;
  if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });

  const decision = evaluateOffer({
    loadboard_rate: load.loadboard_rate,
    counter_offer: body.counter_offer,
    round: body.round,
    previous_counter: body.previous_counter,
  });

  return NextResponse.json({
    ...decision,
    load_id: load.load_id,
    loadboard_rate: load.loadboard_rate,
  });
}
