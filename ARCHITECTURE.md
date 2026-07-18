# Architecture

## Database Schema

Defined in [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql). Row Level Security is enabled on every table; policies are added in Phase 2.

### Entity overview

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`. Holds `role` (`customer` / `artist` / `admin`) that drives which flows a user sees. Auto-created via `handle_new_user()` trigger on signup. |
| `artist_profiles` | Extends `profiles` for artists: shop name, public `slug`, bio, banner, verification flag. |
| `wood_types` | Lookup table powering the storefront's "filter by wood type" facet. |
| `categories` | Lookup table for product categories, self-referencing `parent_id` for future subcategories. |
| `products` | The catalog. Belongs to an artist, optional category/wood type, price in cents, `status` (draft/published/archived), SEO meta fields, denormalized `view_count`. |
| `product_images` | Ordered image gallery per product, pointing at Supabase Storage paths. |
| `custom_order_inquiries` | The core "secure custom order inquiry" loop — a customer's request to an artist, optionally tied to a product. |
| `inquiry_messages` | Threaded messages within a single inquiry. |
| `inquiry_status_history` | Append-only log of inquiry status transitions, written by trigger — feeds funnel/conversion analytics. |
| `orders` / `order_items` | Minimal checkout data model (Phase 5): an accepted inquiry or direct purchase becomes an order with line items. |
| `product_views` | Raw page-view event stream (product, viewer, session, referrer) — the source table for future analytics dashboards. |

### Design notes

- **Analytics-ready**: `product_views` and `inquiry_status_history` are append-only event tables, kept separate from the mutable entities they describe, so dashboards can aggregate over time without touching operational data.
- **Money as integers**: all prices are `*_cents` integers to avoid floating-point rounding errors.
- **Soft taxonomy**: `wood_types` and `categories` are normalized lookup tables (not free-text) so storefront filters and future analytics stay consistent.
- **RLS-first**: every table has RLS enabled from the first migration — nothing is publicly writable by default even before policies exist.

## Folder Structure (target)

Application scaffolding lands in Phase 2; the tree below is the target layout this repo is organized around.

```
woodmarketplace/
├── app/
│   ├── (marketing)/            # public landing page
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/           # artist vs customer signup
│   ├── (storefront)/
│   │   ├── shop/                # product feed + filters (wood type, price, category)
│   │   ├── products/[slug]/     # SEO-optimized product detail page
│   │   └── artists/[slug]/      # public artist storefront page
│   ├── (dashboard)/
│   │   └── artist/
│   │       ├── products/        # product CRUD
│   │       ├── inquiries/       # incoming custom order requests
│   │       └── profile/         # artist profile management
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── storefront/               # product cards, filters, galleries
│   ├── dashboard/                 # artist dashboard widgets
│   └── shared/                    # cross-cutting components (nav, footer, etc.)
├── lib/
│   ├── supabase/                 # client.ts, server.ts, middleware.ts
│   ├── validations/               # zod schemas for forms/API input
│   └── utils/
├── types/
│   └── database.types.ts         # generated from the Supabase schema
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql
│   └── config.toml
├── public/
├── .gitignore
├── README.md
└── ARCHITECTURE.md
```

## Roadmap

1. **Phase 1 — Architecture, Database & Git Setup** *(this phase)*: schema, git setup, folder structure.
2. **Phase 2 — Setup, Auth & Security**: Next.js/Tailwind/shadcn config, Supabase client setup, artist vs. customer auth flows, RLS policies.
3. **Phase 3 — The Artist Dashboard**: profile management, product CRUD, inquiry inbox.
4. **Phase 4 — The Storefront & SEO**: product feed, filters, SEO-optimized product pages with structured data.
5. **Phase 5 — Custom Orders & Checkout**: inquiry messaging UI, cart/checkout data flow.
