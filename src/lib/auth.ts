import { NextResponse } from "next/server";

export function requireApiKey(req: Request): NextResponse | null {
  const expected = process.env.API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: API_KEY env var not set" },
      { status: 500 },
    );
  }
  const provided = req.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
