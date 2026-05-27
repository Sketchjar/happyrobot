import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import { verifyMcNumber } from "@/lib/fmcsa";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  let body: { mc_number?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.mc_number) {
    return NextResponse.json({ error: "mc_number is required" }, { status: 400 });
  }

  const result = await verifyMcNumber(body.mc_number);
  return NextResponse.json(result);
}
