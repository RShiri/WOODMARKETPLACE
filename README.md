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

## Deploying to Production (Supabase + Vercel)

No CLI required — everything below is copy-paste through the two dashboards.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**. Pick a name, a database
   password (save it somewhere), and a region. Provisioning takes ~2 minutes.
2. **Project Settings → API** — copy three values, you'll need them in step 3:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret — never put it in
     client-side code or a public repo)

### 2. Run the database migrations

In the Supabase dashboard, open **SQL Editor → New query**, then run each file in
`supabase/migrations/` **in order** (0001 → 0007), pasting the full contents of each file and
clicking Run before moving to the next one. Then do the same with `supabase/seed.sql` — it's
safe to re-run and is what makes the calculator actually return a price (default pricing
config + material rates + a few pre-cached LEGO sets).

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import this GitHub repo.
2. Vercel auto-detects Next.js — no build config changes needed. Set the branch to deploy
   (this branch, `claude/lego-display-box-ecommerce-j7bbxy`, or `main` once merged).
3. Under **Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
   | `NEXT_PUBLIC_SITE_URL` | leave blank for now — see step 4 |
   | `WHATSAPP_WEBHOOK_SECRET` | any random string |

4. Click **Deploy**. Once it finishes, copy the assigned `*.vercel.app` URL, go back to
   **Project Settings → Environment Variables**, set `NEXT_PUBLIC_SITE_URL` to that URL, and
   redeploy (**Deployments → ⋯ → Redeploy**) — this is what makes checkout links (including the
   ones the WhatsApp bot hands back) point at the right place.

### 4. Send the demo

Share the Vercel URL directly — that's the live storefront. For the WhatsApp bot flow without a
real WhatsApp Business account, send `<your-url>/wa-sim` instead (see the Demo section below);
it runs the identical bot logic in a browser chat UI.

### 5. Make yourself an admin (optional, for `/admin/orders`)

Register a normal account at `/register`, then in Supabase's **SQL Editor** run:

```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```

### Tests

The pricing engine, LEGO set parser/heuristic, and WhatsApp message parser are all pure
functions with unit tests:

```bash
npm test
```

## Environment Variables

Never commit real secrets. Copy `.env.example` to `.env.local` and fill in your own values.
`BRICKSET_API_KEY`, the four `BRICKLINK_*` credentials, and `REBRICKABLE_API_KEY` are all
optional — the LEGO dimension resolver tries each in turn and falls back to a piece-count
heuristic (clearly labeled as an estimate) when they're absent, so the app runs end-to-end
with zero external API keys. Note that BrickLink records *packaging* dimensions rather than
built-model dimensions, so anything resolved from it is labeled "estimated" and Brickset is
preferred whenever it has the set on file. `NEXT_PUBLIC_SUPPORT_WHATSAPP` /
`NEXT_PUBLIC_SUPPORT_EMAIL` are also optional, but without one of them the "Request a Custom
Engineered Quote" CTA (shown for boxes over `pricing_config.max_dim_mm`) has nowhere to send
the customer. `SUPABASE_SERVICE_ROLE_KEY` is required —
quotes, orders, and the WhatsApp bot all read/write through the service-role client server-side
(see ARCHITECTURE.md's RLS design notes for why).

## Demo in 5 Minutes

With `npm run dev` running and the database migrated + seeded:

1. **Web calculator** — go to `/calculator`. Either:
   - Enter dimensions directly (e.g. 30 × 20 × 25 cm) and watch the price update live, or
   - Switch to "I have a LEGO set", enter `10294` (pre-seeded — the Titanic), and watch it
     auto-fill dimensions with a confidence badge.
   - Click "How is this calculated?" to see the full cost breakdown.
   - Click "Order this box" to add it to your cart (top-right icon) — the cart supports
     multiple boxes at once. Adjust quantities on `/cart`, then fill in guest checkout details
     on `/checkout` (no account required) → land on the confirmation page.
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
up at `/account`. Admin accounts (see the deployment guide above) can see and update every
order's status at `/admin/orders`.
