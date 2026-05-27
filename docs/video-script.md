# 5-min demo video script

Target length: **5:00**. Record with screen + voiceover (Loom works well).

---

## 0:00 – 0:30 · Open and frame the problem (30s)

> "Hi Carlos — quick walkthrough of the inbound carrier sales POC I built on HappyRobot. The goal: take a carrier call end-to-end — verify them, match them to a load, negotiate the rate, hand off — with everything observable from one dashboard. Here's what that looks like."

Show: the dashboard URL in the browser tab.

---

## 0:30 – 1:30 · Use-case setup tour (60s)

Switch to the HappyRobot workflow editor.

> "This is the workflow. Greet → ask MC number → call our `carrier/verify` endpoint → branch on eligibility. If eligible, we ask for the lane and equipment, search loads, pitch the top match, and route into the negotiation loop. The negotiation node calls our `negotiate` endpoint with a round counter, up to three rounds. On agreement we play the mock-transfer line. After the call, the extraction and classification nodes pull out outcome, sentiment, and a summary, and we post that to `/api/calls` to log it."

Highlight each node briefly as you talk. Don't dwell.

---

## 1:30 – 3:30 · Live demo (2 min)

Kick off a web call from the HappyRobot trigger.

**Round 1 — happy path / immediate accept**
- Give a real eligible MC number.
- Say: "I'm looking for Chicago to Dallas, dry van."
- When pitched at $2400, say: "Yep that works."
- Confirm: mock-transfer line plays, call ends.

Refresh `/dashboard` — new row appears with `outcome=accepted`, sentiment positive.

**Round 2 — full negotiation**
- Start a second call. Same eligible MC.
- Ask for the same lane.
- Counter at $2800, then $2700, then $2600.
- Show the agent counter-offers each round and lands at the ceiling on round 3.
- Accept the final.

Refresh dashboard. Conversion rate, avg rounds, rate-vs-loadboard all update.

(Optional third call: ineligible MC → polite decline → logged as `ineligible`.)

---

## 3:30 – 4:30 · Dashboard tour (60s)

Walk through the panels:

> "Up top: total calls, conversion, average negotiation rounds, and the margin signal — final rate minus loadboard. Outcome pie. Sentiment bar. Rate-by-equipment shows where we're paying over or under the board. Recent calls table is the operational view — desk lead can scan this and pick which calls to listen back to. Everything reads from the same SQLite the API writes to, so it's real-time, no ETL."

---

## 4:30 – 5:00 · Wrap and roadmap (30s)

> "Stack: Next.js, SQLite, Docker, on Fly.io with HTTPS and API-key auth. The build description in the repo covers the architecture and where I'd take it next — SSO on the dashboard, Postgres for multi-tenant, webhook fan-out to your TMS, and a feedback loop that tunes the negotiation policy per lane based on logged outcomes. Looking forward to talking through it."

End with the dashboard visible.

---

## Pre-record checklist

- [ ] Fly deploy is live and healthy (`/api/health` returns 200)
- [ ] At least one prior call in the DB so the dashboard isn't empty when you open it
- [ ] HappyRobot workflow's tool nodes have the production API URL + key
- [ ] FMCSA key works (test one verify call beforehand)
- [ ] Browser zoom 110–125% so charts read on video
- [ ] Mic test
