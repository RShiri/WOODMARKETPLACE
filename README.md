# BrickCase

Custom perspex (acrylic) display boxes for LEGO collectors — an e-commerce storefront with a
live dynamic pricing calculator, a LEGO-set-number dimension lookup, and a WhatsApp bot that
quotes a price and hands back a checkout link.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, shadcn/ui
- **Backend/Database/Auth**: Supabase (PostgreSQL, Authentication)
- **Pricing/LEGO/Bot logic**: plain TypeScript modules under `lib/`, called from both the web
  UI and the WhatsApp webhook — one pricing engine, every channel
- **Deployment**: Vercel

## Project Status

🚧 In active development. See [ARCHITECTURE.md](./ARCHITECTURE.md) and [PLAN.md](./PLAN.md)
for the full design and execution plan.

## Development Roadmap

- [x] **P0**: Repurpose scaffold & rebrand
- [ ] **P1**: Database schema (quotes, LEGO cache, pricing config)
- [ ] **P2**: Pricing engine + quote API
- [ ] **P3**: LEGO dimension resolver
- [ ] **P4**: Calculator & storefront UI
- [ ] **P5**: Cart & checkout
- [ ] **P6**: WhatsApp bot + simulator
- [ ] **P7**: E2E hardening & demo

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project credentials
npm run dev
```

### Database

The schema lives in `supabase/migrations/`. Once you have a Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Tests

The pricing engine and LEGO dimension parser are pure functions with unit tests:

```bash
npm test
```

## Environment Variables

Never commit real secrets. Copy `.env.example` to `.env.local` and fill in your own values.
`BRICKSET_API_KEY` and `REBRICKABLE_API_KEY` are optional — the LEGO dimension resolver falls
back to a piece-count heuristic (clearly labeled as an estimate) when they're absent, so the
app runs end-to-end with zero external API keys.
