# BrickCase

Custom perspex (acrylic) display boxes for LEGO collectors — an e-commerce storefront with a
live dynamic pricing calculator, a LEGO-set-number dimension lookup, and a WhatsApp bot that
quotes a price and hands back a checkout link.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, shadcn/ui
- **Backend/Database/Auth**: Supabase (PostgreSQL, Authentication)
- **Pricing/LEGO/Bot logic**: plain TypeScript modules under `lib/`, called from both the web
  UI and the WhatsApp bot — one pricing engine, every channel
- **Deployment**: Vercel

## Project Status

✅ All planned phases (P0–P7) implemented. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the
schema/folder structure and [PLAN.md](./PLAN.md) for the original multi-agent design doc.

## Development Roadmap

- [x] **P0**: Repurpose scaffold & rebrand
- [x] **P1**: Database schema (quotes, LEGO cache, pricing config)
- [x] **P2**: Pricing engine + quote API
- [x] **P3**: LEGO dimension resolver
- [x] **P4**: Calculator & storefront UI
- [x] **P5**: Cart & checkout
- [x] **P6**: WhatsApp bot + simulator
- [x] **P7**: E2E hardening & demo

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project credentials
npm run dev
```

### Database

The schema lives in `supabase/migrations/`, applied in filename order. Once you have a
Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # or: supabase db reset (applies seed.sql too)
```

The seed data includes default pricing config, sample material rates, a few gallery items, and
5 pre-cached famous LEGO sets — the app is unusable without at least `pricing_config` and
`material_costs` seeded (every quote request depends on them).

### Tests

The pricing engine, LEGO set parser/heuristic, and WhatsApp message parser are all pure
functions with unit tests:

```bash
npm test
```

## Environment Variables

Never commit real secrets. Copy `.env.example` to `.env.local` and fill in your own values.
`BRICKSET_API_KEY` and `REBRICKABLE_API_KEY` are optional — the LEGO dimension resolver falls
back to a piece-count heuristic (clearly labeled as an estimate) when they're absent, so the
app runs end-to-end with zero external API keys. `SUPABASE_SERVICE_ROLE_KEY` is required —
quotes, orders, and the WhatsApp bot all read/write through the service-role client server-side
(see ARCHITECTURE.md's RLS design notes for why).

## Demo in 5 Minutes

With `npm run dev` running and the database migrated + seeded:

1. **Web calculator** — go to `/calculator`. Either:
   - Enter dimensions directly (e.g. 30 × 20 × 25 cm) and watch the price update live, or
   - Switch to "I have a LEGO set", enter `10294` (pre-seeded — the Titanic), and watch it
     auto-fill dimensions with a confidence badge.
   - Click "How is this calculated?" to see the full cost breakdown.
   - Click "Order this box" → adjust quantity on `/cart` → fill in guest checkout details on
     `/checkout` (no account required) → land on the confirmation page.
2. **WhatsApp bot simulator** — go to `/wa-sim` (not linked from the main nav; dev tool). Try:
   - `10294` → bot resolves the set, asks to confirm dimensions → reply `yes` → pick a base
     (`1`–`4`) → bot replies with a price and a `/checkout?quote=...` link.
   - Or skip the set lookup and send dimensions directly: `30x20x25cm`.
   - Open the returned checkout link in a new tab — it's the exact same guest checkout flow as
     the web path, because both create their quote through the same `lib/pricing/quote-service`.
3. **Price transparency check** — compare the price shown in the WhatsApp flow against the same
   dimensions entered manually in `/calculator`: they match exactly, since both call
   `lib/pricing/engine.ts`.

Optional: create an account at `/register` before checking out — the resulting order will show
up at `/account`.
