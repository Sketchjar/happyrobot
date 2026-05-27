# Email to Carlos Becker

**To:** c.becker@happyrobot.ai
**CC:** <recruiter@happyrobot.ai>
**Subject:** Inbound Carrier Sales POC — ready for our walkthrough

---

Hi Carlos,

Ahead of our meeting, I wanted to share what I've put together for the inbound carrier sales use case so you can poke around before we connect.

**What's built**

- An AI voice agent on the HappyRobot platform that takes inbound carrier calls end-to-end: pulls their MC number, verifies eligibility against FMCSA, matches them to a load from our catalog, negotiates the rate (up to three rounds with a deterministic policy), and mocks the hand-off to a sales rep on agreement.
- A custom Next.js + SQLite API that backs the agent (FMCSA lookup, load search, negotiation, call logging) — HTTPS, API-key auth, deployed on Fly.io in a Docker container.
- A purpose-built analytics dashboard that shows total calls, conversion rate, average negotiation rounds, rate delta vs loadboard, outcome and sentiment breakdowns, and a live feed of recent calls.

**Links**

- Dashboard: <https://happyrobot-inbound.fly.dev/dashboard>
- API: <https://happyrobot-inbound.fly.dev/api/health>
- Code: <https://github.com/gaurav-roy/happyrobot-inbound>
- HappyRobot workflow: <https://app.happyrobot.ai/workflows/...>
- 5-min demo video: <https://www.loom.com/share/...>

**What I'd like to cover on the call**

1. A live web-call demo — happy path, plus a negotiation that goes the full three rounds.
2. A quick tour of the dashboard and the metrics I picked (and why).
3. Where I'd take this next: carrier-side authentication on the dashboard, lane-aware pricing, post-call summaries pushed to a CRM, and webhook fan-out for downstream automations.

The Acme Logistics-style build description is in the repo at `docs/acme-build-description.md` if you'd like a deeper read before the meeting.

Looking forward to it — let me know if you'd like anything specific demoed.

Best,
Gaurav
