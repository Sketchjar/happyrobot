# Architecture

## High-level

```mermaid
flowchart LR
  Carrier((Carrier))
  HR[HappyRobot Agent<br/>Workflow]
  API[Next.js API<br/>Fly.io · HTTPS · x-api-key]
  FMCSA[(FMCSA QCMobile API)]
  DB[(SQLite<br/>persistent volume)]
  Dash[/dashboard<br/>server-rendered/]

  Carrier -->|web call| HR
  HR -->|POST /api/carrier/verify| API
  HR -->|POST /api/loads/search| API
  HR -->|POST /api/negotiate| API
  HR -->|POST /api/calls| API
  API --> FMCSA
  API <--> DB
  Dash --> DB
```

## Call flow

```mermaid
sequenceDiagram
  participant C as Carrier
  participant A as HappyRobot Agent
  participant API as Next.js API
  participant F as FMCSA

  C->>A: Inbound web call
  A->>C: Greet, ask MC #
  C->>A: MC 123456
  A->>API: POST /api/carrier/verify
  API->>F: GET /carriers/docket-number/123456
  F-->>API: { allowedToOperate, legalName, ... }
  API-->>A: { eligible: true, carrier_name }
  A->>C: Ask origin/destination/equipment
  C->>A: "Chicago to Dallas, dry van"
  A->>API: POST /api/loads/search
  API-->>A: top match (HR-1001, $2400)
  A->>C: Pitch lane + rate
  C->>A: "I'd want $2700"
  loop up to 3 rounds
    A->>API: POST /api/negotiate { round: n }
    API-->>A: { decision, target_rate, message }
    A->>C: Counter or accept
    C->>A: Response
  end
  A->>C: "Transfer was successful..."
  A->>API: POST /api/calls { outcome, sentiment, ... }
```

## Components

| Layer | Responsibility | Key files |
|---|---|---|
| HappyRobot workflow | Conversation, extraction, classification | (configured in HappyRobot UI) |
| API gateway | Auth (`x-api-key`), routing | `src/lib/auth.ts`, `src/app/api/**/route.ts` |
| Domain logic | FMCSA verification, negotiation policy | `src/lib/fmcsa.ts`, `src/lib/negotiate.ts` |
| Persistence | SQLite (loads + calls) | `src/lib/db.ts`, `scripts/seed.ts` |
| Read model | Dashboard (server components) | `src/app/dashboard/page.tsx`, `src/components/dashboard/*` |
| Delivery | Docker + Fly.io | `Dockerfile`, `fly.toml` |

## Data model

```
loads
  load_id PK
  origin, destination
  pickup_datetime, delivery_datetime
  equipment_type
  loadboard_rate
  notes, weight, commodity_type, num_of_pieces, miles, dimensions

calls
  id PK
  created_at
  mc_number, carrier_name
  load_id FK -> loads
  outcome           (accepted | rejected | no_match | ineligible | abandoned)
  sentiment         (positive | neutral | negative)
  final_rate, loadboard_rate
  num_rounds
  summary
```

## Trust boundaries

- The HappyRobot agent → API edge is the only authenticated boundary. Everything else (FMCSA, SQLite) is server-internal.
- The dashboard reads SQLite directly via server components — no client-side credentials.
- Secrets (`API_KEY`, `FMCSA_WEBKEY`) live in Fly secrets and `.env` (gitignored).
