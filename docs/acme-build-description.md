# Acme Logistics — Inbound Carrier Sales Automation

**Prepared by:** Gaurav
**Platform:** HappyRobot
**Status:** Proof of concept, ready for pilot

---

## 1. Executive summary

Acme's inbound carrier desk fields hundreds of calls a day from drivers and dispatchers looking for loads. Roughly a third of those calls don't result in a booking — and a meaningful fraction never reach a rep because of after-hours volume, hold times, or simple mismatch between what the caller wants and what's on the board.

This POC replaces the first-touch portion of that workflow with an AI voice agent built on HappyRobot. The agent handles the conversation end-to-end: it vets the carrier against FMCSA, finds a viable load, negotiates the rate within a policy you control, and either hands off to a human rep on agreement or politely closes the call. Every conversation is logged, classified, and surfaced on a real-time analytics dashboard so the desk lead can see what's working and what isn't.

The build covers the technical objective, the metrics objective, and the deployment objective in the brief, deployed as a single containerized Next.js service behind HTTPS with API-key authentication.

---

## 2. The carrier journey

```
Carrier dials in
   │
   ▼
[ Greet → Ask MC number ]
   │
   ▼  POST /api/carrier/verify  ──► FMCSA QCMobile API
[ Eligible? ]
   │ no  ──► Polite decline, log outcome=ineligible
   │ yes
   ▼
[ Ask origin / destination / equipment ]
   │
   ▼  POST /api/loads/search
[ Pitch top match ]
   │
   ▼
[ Carrier counter offer? ]
   │ no  ──► Accept at loadboard rate, mock transfer
   │ yes
   ▼  POST /api/negotiate  (round = 1..3)
[ Decision: accept | counter | reject ]
   │
   ▼  After call ends, extraction + classification nodes run
[ POST /api/calls — outcome, sentiment, summary, final rate, rounds ]
   │
   ▼
[ Dashboard updates in real time ]
```

A carrier hangs up with one of five logged outcomes: `accepted`, `rejected`, `no_match`, `ineligible`, or `abandoned`.

---

## 3. Architecture

```
┌────────────────────┐       ┌───────────────────────────────┐
│ Carrier (Web Call) │──────►│ HappyRobot Agent (workflow)   │
└────────────────────┘       │  - Prompt + extraction nodes  │
                             │  - Tool calls to our API      │
                             └──────────────┬────────────────┘
                                            │ HTTPS + x-api-key
                                            ▼
                             ┌───────────────────────────────┐
                             │ Next.js service (Fly.io)      │
                             │  /api/carrier/verify          │
                             │  /api/loads/search, /loads/:id│
                             │  /api/negotiate               │
                             │  /api/calls (POST + GET)      │
                             │  /api/metrics                 │
                             │  /dashboard (server-rendered) │
                             └──────┬────────────────┬───────┘
                                    │                │
                                    ▼                ▼
                         FMCSA QCMobile API   SQLite (volume)
```

**Why this shape:** the brief calls for a custom dashboard, an API, a container, and a cloud deploy. Co-locating the API and the dashboard in a single Next.js app means one deploy artifact, one auth surface, one place to read from the database, and a single URL to share with stakeholders.

---

## 4. Negotiation policy

The negotiation is deliberately deterministic, not an LLM black box. The agent is fluent on the call; the *decision* about whether to accept a rate is policy-driven and explainable to a freight broker:

- **Floor:** 95% of loadboard rate. The agent never agrees below this.
- **Ceiling:** 108% of loadboard rate. Any carrier offer at or below this is accepted immediately.
- **Round 1–2:** counter at the midpoint of (previous counter, carrier's offer).
- **Round 3:** final answer is the ceiling. If the carrier still won't accept, the agent politely closes.

This keeps margin behavior transparent and tunable per lane or per customer.

---

## 5. Metrics & dashboard

Built ourselves rather than using platform analytics, as requested. Available at `/dashboard`:

**KPI cards**
- Total calls
- Conversion rate (% accepted)
- Average negotiation rounds per call
- Average final rate vs loadboard rate (the margin signal)

**Charts**
- Outcome distribution (pie): accepted / rejected / no_match / ineligible / abandoned
- Carrier sentiment (bar): positive / neutral / negative
- Rate by equipment type — average final vs loadboard, side by side

**Recent calls table** — time, MC, carrier, load, outcome, sentiment, rounds, loadboard rate, final rate.

Sentiment and outcome are classified by HappyRobot's extraction nodes after the call ends, then posted to `/api/calls` for persistence. Everything in the dashboard is read from the same SQLite that backs the API.

---

## 6. Security

- **HTTPS** end-to-end (Fly.io managed certificate).
- **API key authentication** on every `/api/*` route except `/api/health`. The key is set via `fly secrets` and never touches the repo.
- **Server-side credentials only** — the FMCSA web key is read from env, never returned to the client.
- The dashboard is intentionally unauthenticated for the POC. For pilot we'd front it with SSO (Auth.js + Google Workspace) or HTTP Basic Auth.

---

## 7. Deployment & operations

- **Container:** multi-stage `node:20-alpine` build, Next.js standalone output, non-root user, ~150MB image.
- **Host:** Fly.io, single VM (`shared-cpu-1x`, 512 MB), autostart/autostop enabled to keep cost near zero between calls.
- **Storage:** 1 GB persistent volume mounted at `/data` for SQLite. Snapshots scheduled by Fly.
- **Reproducibility:** README has the exact `fly launch → fly volumes create → fly secrets set → fly deploy` sequence. Could be wrapped in a single shell script or migrated to Terraform if Acme needs IaC.
- **Health:** `/api/health` returns 200 with a timestamp; Fly hits it every 30s.

---

## 8. What this is not (scope honesty)

- **Single-tenant SQLite.** Fine for a POC; for production we'd move to managed Postgres (Supabase / Neon / RDS) and partition by broker.
- **Call transfer is mocked.** The brief explicitly excludes a real SIP transfer because we're using the web-call trigger.
- **No retraining loop.** The negotiation policy is hardcoded; we'd add a feedback loop where margin outcomes tune the floor/ceiling per lane.
- **Dashboard is read-only.** No filtering, drill-down, or export yet.

---

## 9. Roadmap

| Phase | Work | Outcome |
|---|---|---|
| Pilot (2 weeks) | SSO on dashboard · Postgres migration · per-lane negotiation overrides · CSV export | Production-ready for a single broker |
| Phase 2 (4 weeks) | Webhook fan-out (Slack/CRM/dispatch) · post-call summaries pushed to broker's TMS · A/B test rate ceilings | Tie agent output into existing workflows |
| Phase 3 | Outbound carrier follow-ups · multi-load pitching in one call · lane-pricing model trained on logged outcomes | Move from automation to optimization |

---

## 10. Links

- Live dashboard: https://happyrobot-rmmxjg.fly.dev/dashboard
- API health: https://happyrobot-rmmxjg.fly.dev/api/health
- Code: https://github.com/Sketchjar/happyrobot
- HappyRobot workflow (editor): https://platform.happyrobot.ai/fdegauravchauhan/workflow/qphg214qzg4t/editor/37icomxqlrgx
- Demo video: _(to be added)_
