# HappyRobot — Inbound Carrier Sales (POC)

A working proof-of-concept for the HappyRobot FDE technical challenge. An AI voice agent (built on the HappyRobot platform) handles inbound carrier calls: verifies the carrier with FMCSA, matches them to a load, negotiates the rate, and logs the outcome to a custom analytics dashboard.

**Stack:** Next.js 15 (TypeScript) · SQLite · Docker · Fly.io

**Scenario** FDE Interview Submission

---

## What's in the box

- A secured HTTPS API the HappyRobot agent calls as tools:
  - `POST /api/carrier/verify` — FMCSA MC number lookup
  - `POST /api/loads/search` — load matching by origin / destination / equipment
  - `GET  /api/loads/:id` — load detail
  - `POST /api/negotiate` — deterministic rate-negotiation policy (max 3 rounds)
  - `POST /api/calls` — log call outcome, sentiment, summary
  - `GET  /api/calls`, `GET /api/metrics` — read endpoints for the dashboard
  - `GET  /api/health` — unauthenticated health check
- A custom analytics dashboard at `/dashboard` (KPIs, outcome/sentiment charts, rate-by-equipment, recent calls)
- A Dockerfile and `fly.toml` for one-command deploys to Fly.io
- 20 seeded sample loads in `data/seed-loads.json`

---

## Quick start (local)

```bash
# 1. Install dependencies (better-sqlite3 compiles native bindings)
npm install

# 2. Configure env
cp .env.example .env
# edit .env and set API_KEY (any long random string) and FMCSA_WEBKEY

# 3. Seed the SQLite DB (runs automatically via postinstall, but you can re-run)
npm run seed

# 4. Start dev server
npm run dev

# Open the dashboard
# http://localhost:3000/dashboard

# Smoke test the API
curl -X POST http://localhost:3000/api/loads/search \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin":"Chicago","equipment_type":"Dry Van"}'
```

---

## Run with Docker

```bash
docker build -t happyrobot-inbound .
docker run -p 3000:3000 \
  -e API_KEY="$(openssl rand -hex 32)" \
  -e FMCSA_WEBKEY=your-fmcsa-key \
  happyrobot-inbound
```

The image bakes the seed DB at build time. For persistence across container restarts, mount a volume at `/app/data`.

---

## Deploy to Fly.io

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly auth login

# First deploy — accept the suggested name or change `app` in fly.toml
fly launch --no-deploy --copy-config

# Persistent volume for SQLite (one time)
fly volumes create happyrobot_data --region iad --size 1

# Secrets
fly secrets set \
  API_KEY="$(openssl rand -hex 32)" \
  FMCSA_WEBKEY="your-fmcsa-key"

# Deploy
fly deploy

# Open dashboard
fly open /dashboard
```

HTTPS is provisioned automatically. Re-deploy with `fly deploy` on every change.

---

## HappyRobot workflow setup

1. Create a new workflow in the HappyRobot platform with **Web Call** as the trigger.
2. Add tool nodes that call this API. For every tool, set the header `x-api-key: <your API_KEY>` and the base URL to your Fly.io deployment.
3. Suggested node sequence:
   1. **Greet + ask MC number**
   2. **Tool: `POST /api/carrier/verify`** with `{ "mc_number": "{{mc_number}}" }`. Branch on `eligible`.
   3. If ineligible → polite decline → log call with `outcome: "ineligible"`.
   4. **Ask preferences** (origin, destination, equipment).
   5. **Tool: `POST /api/loads/search`** with `{ "origin": "...", "destination": "...", "equipment_type": "..." }`. Pitch the top result.
   6. **Ask if interested at loadboard rate.** Branch on carrier response.
   7. On counter offer: **Tool: `POST /api/negotiate`** with `{ "load_id": "...", "counter_offer": <number>, "round": <1|2|3> }`. Repeat up to 3 rounds.
   8. On agreement: speak the mock-transfer line (`"Transfer was successful and now you can wrap up the conversation."`).
   9. On call end: use HappyRobot's extraction + classification nodes to derive `outcome`, `sentiment`, `summary`, `final_rate`, `num_rounds`, then **Tool: `POST /api/calls`** to persist.

---

## API reference

All `/api/*` routes (except `/api/health`) require:

```
x-api-key: <API_KEY>
Content-Type: application/json
```

### `POST /api/carrier/verify`
```json
// request
{ "mc_number": "1234567" }

// response
{
  "eligible": true,
  "mc_number": "1234567",
  "carrier_name": "ACME TRUCKING LLC",
  "reason": null
}
```

### `POST /api/loads/search`
```json
// request — all fields optional
{ "origin": "Chicago", "destination": "Dallas", "equipment_type": "Dry Van", "pickup_after": "2026-06-01", "limit": 5 }

// response
{ "count": 1, "loads": [ { "load_id": "HR-1001", ... } ] }
```

### `POST /api/negotiate`
```json
// request
{ "load_id": "HR-1001", "counter_offer": 2700, "round": 1 }

// response
{ "decision": "counter", "target_rate": 2592, "message": "I hear you on $2700 — I can meet you at $2592. Does that work?", "round": 1, "is_final": false, "load_id": "HR-1001", "loadboard_rate": 2400 }
```

Negotiation policy: accept if offer ≤ 108% of loadboard rate; otherwise counter at the midpoint of (previous counter, current offer) for up to 3 rounds, capped at 108% on the final round. Never drop below 95% of loadboard.

### `POST /api/calls`
```json
{
  "mc_number": "1234567",
  "carrier_name": "ACME TRUCKING LLC",
  "load_id": "HR-1001",
  "outcome": "accepted",
  "sentiment": "positive",
  "final_rate": 2592,
  "num_rounds": 2,
  "summary": "Carrier agreed on counter rate after one round."
}
```

`outcome` ∈ `{ accepted | rejected | no_match | ineligible | abandoned }`.

### `GET /api/metrics`
Returns aggregated KPIs powering the dashboard.

---

## Security

- All API endpoints (except `/api/health`) require `x-api-key`.
- HTTPS is terminated by Fly.io with a managed cert.
- `FMCSA_WEBKEY` is server-side only; never returned to the client.
- The dashboard is unauthenticated in the POC — add SSO / Basic Auth before exposing externally.

---

## Project layout

```
src/
  app/
    api/                 # API route handlers
    dashboard/page.tsx   # custom analytics view
    layout.tsx, page.tsx, globals.css
  lib/                   # db, auth, fmcsa, negotiation
  components/dashboard/  # chart + table components
data/seed-loads.json     # 20 sample loads
scripts/seed.ts          # SQLite seeder
docs/                    # deliverable documents
Dockerfile, fly.toml     # deployment
```

---

## Documents

- [Email to Carlos Becker](docs/email-to-carlos.md)
- [Acme Logistics build description](docs/acme-build-description.md)
- [Architecture](docs/architecture.md)
- [Demo video script](docs/video-script.md)
