const FMCSA_BASE = "https://mobile.fmcsa.dot.gov/qc/services";

export type CarrierVerification = {
  eligible: boolean;
  mc_number: string;
  carrier_name: string | null;
  reason: string | null;
  raw?: unknown;
};

export async function verifyMcNumber(mcRaw: string): Promise<CarrierVerification> {
  const mc = mcRaw.replace(/\D/g, "");
  if (!mc) {
    return {
      eligible: false,
      mc_number: mcRaw,
      carrier_name: null,
      reason: "Invalid MC number format",
    };
  }

  const key = process.env.FMCSA_WEBKEY;
  if (!key) {
    return {
      eligible: false,
      mc_number: mc,
      carrier_name: null,
      reason: "FMCSA_WEBKEY not configured on server",
    };
  }

  const url = `${FMCSA_BASE}/carriers/docket-number/${encodeURIComponent(mc)}?webKey=${encodeURIComponent(key)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    return {
      eligible: false,
      mc_number: mc,
      carrier_name: null,
      reason: `Network error contacting FMCSA: ${(err as Error).message}`,
    };
  }

  if (!res.ok) {
    return {
      eligible: false,
      mc_number: mc,
      carrier_name: null,
      reason: `FMCSA returned HTTP ${res.status}`,
    };
  }

  const data = (await res.json()) as { content?: Array<{ carrier?: Record<string, unknown> }> };
  const carrier = data.content?.[0]?.carrier;
  if (!carrier) {
    return {
      eligible: false,
      mc_number: mc,
      carrier_name: null,
      reason: "No carrier found for that MC number",
    };
  }

  const allowedToOperate = String(carrier.allowedToOperate ?? "").toUpperCase() === "Y";
  const statusCode = String(carrier.statusCode ?? "").toUpperCase();
  const isActive = statusCode === "A" || allowedToOperate;
  const legalName = (carrier.legalName as string | undefined) ?? (carrier.dbaName as string | undefined) ?? null;

  return {
    eligible: isActive && allowedToOperate,
    mc_number: mc,
    carrier_name: legalName,
    reason: isActive && allowedToOperate ? null : "Carrier is not authorized to operate",
    raw: carrier,
  };
}
