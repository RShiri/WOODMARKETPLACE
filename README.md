# Woodmarketplace

A niche marketplace platform connecting woodworking artists with customers — catalog browsing, artist storefronts, and secure custom order inquiries.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, shadcn/ui
- **Backend/Database/Auth**: Supabase (PostgreSQL, Authentication, Storage)
- **Deployment**: Vercel

## Project Status

🚧 MVP in active development. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the database schema and folder structure.

## Development Roadmap

- [x] **Phase 1**: Architecture, Database & Git Setup
- [ ] **Phase 2**: Setup, Auth & Security
- [ ] **Phase 3**: The Artist Dashboard
- [ ] **Phase 4**: The Storefront & SEO
- [ ] **Phase 5**: Custom Orders & Checkout

## Getting Started

> Application scaffolding (`package.json`, Next.js config, Supabase client) lands in Phase 2. For now this repo contains the database schema and target folder structure only.

### Database

The schema lives in `supabase/migrations/`. Once you have a Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Environment Variables

Never commit real secrets. Copy `.env.example` (added in Phase 2) to `.env.local` and fill in your own Supabase project credentials.
