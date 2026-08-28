# Architecture

See [PLAN.md](./PLAN.md) for the full multi-agent design and rationale. This file tracks the
schema and folder structure as actually implemented.

## Database Schema

Defined across [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) (kept:
`profiles` + auth trigger) and
[`supabase/migrations/0004_display_boxes.sql`](./supabase/migrations/0004_display_boxes.sql)
(the display-box product model). Row Level Security is enabled on every table.

### Entity overview

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`. Holds `role` (`customer` / `admin`). Auto-created via `handle_new_user()` trigger on signup. Optional — checkout does not require an account. |
| `pricing_config` | Singleton row (id=1) of tunable pricing constants: waste factor, margin %, fees, rounding step, clearance padding, dimension bounds. Mirrored by `lib/pricing/engine.ts`. |
| `material_costs` | Versioned material rates by `(material, thickness_mm)`. The pricing engine picks thickness from the box's longest dimension (3mm ≤300mm, 4mm ≤600mm, 5mm ≤1000mm, 6mm above), then looks up the active, already-effective rate. The 6mm oversized tier is priced at a deliberate premium, not a linear step — see `supabase/migrations/0010_oversized_boxes.sql`. |
| `lego_sets_cache` | Resolved (or estimated) built-model dimensions per LEGO set id, with `source`/`confidence` so the UI can show "estimated — please verify" honestly. |
| `quotes` | **The single source of truth for a priced box.** `shipping_method` is frozen per quote (`oversized_freight` above `pricing_config.oversize_threshold_mm`, else `standard`). Created by both the web calculator and the WhatsApp bot via the same pricing engine call. Checkout always re-reads the price by `id` — never trusts a client-supplied price. Expires after 72h. |
| `wa_sessions` | One row per phone number; holds the WhatsApp bot's conversation FSM state + context. |
| `wa_messages` | Append-only in/out message audit log for the WhatsApp bot. |
| `box_gallery` | Curated marketing gallery for the landing/gallery pages. |
| `orders` / `order_items` | Guest-friendly checkout data model — `customer_id` is nullable since most orders originate from a WhatsApp deep-link and must not require login. Line items snapshot the quote's description/price at order time. `orders.shipping_method` is `oversized_freight` when **any** line is oversized (one long panel sets handling for the whole shipment), frozen at checkout like `total_price_cents` and `currency`. |

### Design notes

- **One pricing engine, three callers**: the web calculator, `POST /api/quote`, and the
  WhatsApp bot all call the same pure function in `lib/pricing/engine.ts`. Prices are computed
  server-side only.
- **Quotes are the trust boundary**: a checkout URL carries an opaque `quote` UUID, never a
  price or dimensions. The server re-reads the persisted `quotes` row, so URL params can't be
  edited to change a price.
- **`quotes`/`wa_sessions`/`wa_messages` have no public/authenticated RLS policies at all** —
  every read/write goes through server-side API routes using the Supabase service role, which
  bypasses RLS. This is intentional: it means the only way to touch pricing data is through
  code that re-validates it, not through a client SDK call.
- **Money as integers**: all prices are `*_cents` integers to avoid floating-point rounding.
- **Dimensions in millimeters**: all box/set dimensions are integer millimeters end-to-end.
- **Guest checkout is the default path**: `orders.customer_id` is nullable; contact details are
  captured directly on the order. An authenticated customer's own orders are still visible via
  RLS (`orders_select_own`) for the optional `/account` order-history page.

## Folder Structure

```
brickcase/
├── app/
│   ├── (marketing)/            # public landing page
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/           # optional account (order history only)
│   ├── calculator/             # THE core page — dimension + set-id tabs, live price
│   ├── gallery/                # box_gallery grid
│   ├── cart/                   # single-quote cart (qty)
│   ├── checkout/                # quote summary + guest checkout form + confirmation
│   ├── account/                 # optional: logged-in customer's order history
│   ├── (dev)/wa-sim/            # WhatsApp bot simulator chat UI (dev-only)
│   ├── api/
│   │   ├── quote/                # POST create, GET /:id
│   │   ├── lego/[setId]/         # GET dimension lookup
│   │   └── whatsapp/webhook/     # POST inbound message handler (provider-facing)
│   ├── checkout/actions.ts       # server action: quote -> order (guest-friendly)
│   ├── auth/                     # signIn/signUp/signOut server actions + callback route
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── shop/                    # calculator, price card/breakdown, gallery, checkout
│   └── shared/                  # nav, footer
├── lib/
│   ├── pricing/                 # engine.ts (pure) + engine.test.ts, config.ts, quote-service.ts
│   ├── lego/                    # resolver.ts (tiered: cache -> Brickset -> BrickLink -> Rebrickable+heuristic)
│   ├── bot/                     # WhatsApp FSM, parsers, adapters (Simulator/Meta/Twilio)
│   ├── orders/                  # placeOrder / getOrderById (service-role, guest checkout)
│   ├── supabase/                # client.ts, server.ts, admin.ts (service role), middleware.ts
│   ├── validations/              # zod schemas for forms/API input
│   └── utils/
├── types/
│   └── database.types.ts         # generated from the Supabase schema
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   └── 0004_display_boxes.sql
│   ├── seed.sql
│   └── config.toml
├── public/
├── .gitignore
├── README.md
├── PLAN.md
└── ARCHITECTURE.md
```

## Execution Phases

See [PLAN.md](./PLAN.md) §5 for the full phase table (P0–P7) and dependency graph.
