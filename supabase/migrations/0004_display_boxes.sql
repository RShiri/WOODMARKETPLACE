-- =============================================================================
-- BrickCase — Display Box Schema
-- P1: Retires the woodworking-marketplace catalog/inquiry tables and replaces
-- them with the display-box product model: pricing config, LEGO set
-- dimension cache, quotes (the single source of truth for a priced box,
-- shared by the web calculator and the WhatsApp bot), WhatsApp session/audit
-- tables, a curated gallery, and a guest-friendly orders/order_items pair.
--
-- `profiles` and its `handle_new_user` trigger are kept as-is (minus the
-- 'artist' role, which no longer applies). Everything else from
-- 0001_init.sql that isn't listed below as "kept" is dropped here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Drop the woodworking-marketplace tables, children first.
-- -----------------------------------------------------------------------------

drop table if exists order_items;
drop table if exists orders;
drop table if exists product_views;
drop table if exists inquiry_messages;
drop table if exists inquiry_status_history;
drop table if exists custom_order_inquiries;
drop table if exists product_images;
drop table if exists products;
drop table if exists categories;
drop table if exists wood_types;
drop table if exists artist_profiles;

drop function if exists log_inquiry_status_change();

-- Storage buckets/policies from 0003_storage.sql were scoped to the
-- artist/product model dropped above — no longer meaningful here.
drop policy if exists "product_images_select_all" on storage.objects;
drop policy if exists "product_images_insert_own" on storage.objects;
drop policy if exists "product_images_update_own" on storage.objects;
drop policy if exists "product_images_delete_own" on storage.objects;
drop policy if exists "artist_banners_select_all" on storage.objects;
drop policy if exists "artist_banners_insert_own" on storage.objects;
drop policy if exists "artist_banners_update_own" on storage.objects;
drop policy if exists "artist_banners_delete_own" on storage.objects;
-- Supabase's managed platform blocks direct DELETE on storage.buckets
-- (must go through the Storage API instead) — the policies above are the
-- part that actually matters for security; dropping the bucket rows
-- themselves is just tidiness, so swallow the error if it's blocked.
do $$
begin
  delete from storage.buckets where id in ('product-images', 'artist-banners');
exception when others then
  raise notice 'Skipping storage.buckets row cleanup (blocked by platform, use Storage API/dashboard if you want these removed): %', sqlerrm;
end $$;

drop type if exists product_status;
drop type if exists inquiry_status;

-- -----------------------------------------------------------------------------
-- profiles.role — drop the 'artist' value. No 'artist' rows can exist yet in
-- any real deployment of this schema (artist_profiles/products, the only
-- things that made an artist role meaningful, are dropped above in this same
-- migration), so a straight retype is safe.
-- -----------------------------------------------------------------------------

create type user_role_v2 as enum ('customer', 'admin');

alter table profiles
  alter column role drop default;
alter table profiles
  alter column role type user_role_v2 using (
    case role::text
      when 'admin' then 'admin'
      else 'customer'
    end
  )::user_role_v2;
alter table profiles
  alter column role set default 'customer';

drop type user_role;
alter type user_role_v2 rename to user_role;

-- handle_new_user still works unchanged: it casts signup metadata to
-- user_role and defaults to 'customer', both still valid.

-- -----------------------------------------------------------------------------
-- pricing_config — one editable settings row driving the pricing engine
-- (lib/pricing/engine.ts mirrors these fields exactly). Enforced as a
-- singleton via the id = 1 check.
-- -----------------------------------------------------------------------------

create table pricing_config (
  id smallint primary key default 1 check (id = 1),
  waste_factor numeric(4,3) not null default 1.150 check (waste_factor >= 1),
  margin_pct numeric(4,3) not null default 0.180 check (margin_pct >= 0),
  min_margin_cents integer not null default 500 check (min_margin_cents >= 0),
  assembly_fee_cents integer not null default 300 check (assembly_fee_cents >= 0),
  base_led_fee_cents integer not null default 1200 check (base_led_fee_cents >= 0),
  min_price_cents integer not null default 1500 check (min_price_cents >= 0),
  rounding_step_cents integer not null default 100 check (rounding_step_cents > 0),
  clearance_padding_mm smallint not null default 10 check (clearance_padding_mm >= 0),
  min_dim_mm smallint not null default 50 check (min_dim_mm > 0),
  max_dim_mm smallint not null default 1000 check (max_dim_mm > 0),
  updated_at timestamptz not null default now()
);

create trigger pricing_config_set_updated_at
  before update on pricing_config
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- material_costs — versioned material rates. thickness_mm is chosen by the
-- pricing engine from the box's longest dimension; cost rows are looked up
-- by (material, thickness_mm) among active, already-effective rows.
-- -----------------------------------------------------------------------------

create table material_costs (
  id uuid primary key default gen_random_uuid(),
  material text not null check (material in ('acrylic_clear', 'acrylic_black', 'acrylic_frosted')),
  thickness_mm smallint not null check (thickness_mm > 0),
  cost_per_m2_cents integer not null check (cost_per_m2_cents >= 0),
  cut_cost_per_m_cents integer not null check (cut_cost_per_m_cents >= 0),
  effective_from timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (material, thickness_mm, effective_from)
);

create index material_costs_lookup_idx on material_costs (material, thickness_mm, active, effective_from desc);

-- -----------------------------------------------------------------------------
-- lego_sets_cache — resolved (or estimated) built-model dimensions for a
-- LEGO set number, keyed by the normalized set id (e.g. '10294-1'). Written
-- by lib/lego/resolver.ts on cache miss; read on every lookup.
-- -----------------------------------------------------------------------------

create table lego_sets_cache (
  set_id text primary key,
  name text,
  length_mm integer check (length_mm is null or length_mm > 0),
  width_mm integer check (width_mm is null or width_mm > 0),
  height_mm integer check (height_mm is null or height_mm > 0),
  piece_count integer check (piece_count is null or piece_count >= 0),
  theme text,
  source text not null check (source in ('brickset', 'rebrickable', 'estimated', 'manual')),
  confidence text not null check (confidence in ('exact', 'estimated')),
  image_url text,
  fetched_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- quotes — the single source of truth for a priced box. Created by both the
-- web calculator (POST /api/quote) and the WhatsApp bot; checkout always
-- re-reads the persisted price by id rather than trusting anything in the
-- URL, so a quote's price can never be tampered with client-side.
-- -----------------------------------------------------------------------------

create table quotes (
  id uuid primary key default gen_random_uuid(),
  length_mm integer not null check (length_mm > 0),
  width_mm integer not null check (width_mm > 0),
  height_mm integer not null check (height_mm > 0),
  base_type text not null check (base_type in ('none', 'acrylic_clear', 'acrylic_black', 'led')),
  thickness_mm smallint not null check (thickness_mm > 0),
  lego_set_id text references lego_sets_cache (set_id) on delete set null,
  price_cents integer not null check (price_cents >= 0),
  breakdown jsonb not null,
  channel text not null default 'web' check (channel in ('web', 'whatsapp')),
  wa_phone text,
  status text not null default 'active' check (status in ('active', 'converted', 'expired')),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  created_at timestamptz not null default now()
);

create index quotes_wa_phone_idx on quotes (wa_phone, created_at desc);
create index quotes_status_expires_idx on quotes (status, expires_at);

-- -----------------------------------------------------------------------------
-- wa_sessions / wa_messages — WhatsApp bot conversation state (one row per
-- phone number) and an audit log of every inbound/outbound message. Written
-- exclusively by the /api/whatsapp/webhook route using the service role.
-- -----------------------------------------------------------------------------

create table wa_sessions (
  phone text primary key,
  state text not null default 'IDLE',
  context jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger wa_sessions_set_updated_at
  before update on wa_sessions
  for each row execute function set_updated_at();

create table wa_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  direction text not null check (direction in ('in', 'out')),
  body text not null,
  created_at timestamptz not null default now()
);

create index wa_messages_phone_created_at_idx on wa_messages (phone, created_at);

-- -----------------------------------------------------------------------------
-- box_gallery — curated marketing gallery shown on the landing/gallery pages.
-- -----------------------------------------------------------------------------

create table box_gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_path text,
  length_mm integer,
  width_mm integer,
  height_mm integer,
  blurb text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index box_gallery_sort_order_idx on box_gallery (sort_order);

-- -----------------------------------------------------------------------------
-- orders / order_items — guest-friendly checkout data model. customer_id is
-- nullable: most orders originate from a WhatsApp deep-link and should never
-- be forced through a login. Contact details are captured directly on the
-- order instead of assumed from a profile.
-- -----------------------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes (id) on delete set null,
  customer_id uuid references profiles (id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status order_status not null default 'pending',
  total_price_cents integer not null check (total_price_cents >= 0),
  currency text not null default 'usd',
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

create index orders_customer_id_idx on orders (customer_id);
create index orders_quote_id_idx on orders (quote_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  quote_id uuid references quotes (id) on delete set null,
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on order_items (order_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table pricing_config enable row level security;
alter table material_costs enable row level security;
alter table lego_sets_cache enable row level security;
alter table quotes enable row level security;
alter table wa_sessions enable row level security;
alter table wa_messages enable row level security;
alter table box_gallery enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- pricing_config / material_costs: public read (the calculator needs them
-- client-side-readable in principle, though the app always prices
-- server-side), admin-only writes.
create policy "pricing_config_select_all"
  on pricing_config for select
  to public
  using (true);

create policy "pricing_config_update_admin"
  on pricing_config for update
  to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "material_costs_select_active"
  on material_costs for select
  to public
  using (active);

create policy "material_costs_insert_admin"
  on material_costs for insert
  to authenticated
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "material_costs_update_admin"
  on material_costs for update
  to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- lego_sets_cache: public read (feeds the calculator's set-id lookup
-- directly); writes only via the service role (the resolver runs server-side).
create policy "lego_sets_cache_select_all"
  on lego_sets_cache for select
  to public
  using (true);

-- box_gallery: public read, admin write.
create policy "box_gallery_select_all"
  on box_gallery for select
  to public
  using (true);

create policy "box_gallery_insert_admin"
  on box_gallery for insert
  to authenticated
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "box_gallery_update_admin"
  on box_gallery for update
  to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "box_gallery_delete_admin"
  on box_gallery for delete
  to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- quotes / wa_sessions / wa_messages: deliberately NO public or authenticated
-- policies. A quote's price must never be trusted from a client-editable
-- source, so all reads/writes go through server-side API routes using the
-- service role (which bypasses RLS). Same reasoning for the WhatsApp
-- session/audit tables — they're never read by browser clients at all.

-- orders / order_items: a logged-in customer can see their own order
-- history (used by /account); guest orders (customer_id null) are only
-- readable via the service role, e.g. the order confirmation page reads by
-- id immediately after a service-role insert. No public/authenticated
-- INSERT policy — orders are always created by the server action using the
-- service role, since pricing must be re-verified against the quote there.
create policy "orders_select_own"
  on orders for select
  to authenticated
  using (customer_id = auth.uid());

create policy "order_items_select_own_order"
  on order_items for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.customer_id = auth.uid()
    )
  );
