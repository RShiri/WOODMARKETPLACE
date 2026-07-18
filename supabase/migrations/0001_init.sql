-- =============================================================================
-- Woodworking Marketplace — Initial Schema
-- Phase 1: Core relational schema, analytics event tables, triggers.
-- Row Level Security is enabled on every table here; policies are defined in
-- the Phase 2 migration (0002_rls_policies.sql).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type user_role as enum ('customer', 'artist', 'admin');
create type product_status as enum ('draft', 'published', 'archived');
create type inquiry_status as enum (
  'new', 'in_discussion', 'quoted', 'accepted', 'declined', 'completed', 'cancelled'
);
create type order_status as enum ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded');

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- -----------------------------------------------------------------------------

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — 1:1 with auth.users, holds the role that drives artist vs
-- customer flows throughout the app.
-- -----------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-provision a profile row whenever a new Supabase auth user is created.
-- The `role` and `full_name` are read from signup metadata
-- (supabase.auth.signUp({ options: { data: { role, full_name } } })).
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -----------------------------------------------------------------------------
-- artist_profiles — extends profiles for the artist-facing storefront.
-- -----------------------------------------------------------------------------

create table artist_profiles (
  id uuid primary key references profiles (id) on delete cascade,
  shop_name text not null,
  slug text not null unique,
  bio text,
  banner_url text,
  location text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_profiles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger artist_profiles_set_updated_at
  before update on artist_profiles
  for each row execute function set_updated_at();

create index artist_profiles_slug_idx on artist_profiles (slug);

-- -----------------------------------------------------------------------------
-- Lookup tables: wood_types, categories
-- -----------------------------------------------------------------------------

create table wood_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  parent_id uuid references categories (id) on delete set null,
  created_at timestamptz not null default now()
);

create index categories_parent_id_idx on categories (parent_id);

-- -----------------------------------------------------------------------------
-- products — the catalog. Denormalized view_count for fast "popular" sorts;
-- authoritative view history lives in product_views for analytics.
-- -----------------------------------------------------------------------------

create table products (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artist_profiles (id) on delete cascade,
  category_id uuid references categories (id) on delete set null,
  wood_type_id uuid references wood_types (id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  is_made_to_order boolean not null default false,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  status product_status not null default 'draft',
  meta_title text,
  meta_description text,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (artist_id, slug)
);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create index products_artist_id_idx on products (artist_id);
create index products_status_category_idx on products (status, category_id);
create index products_status_wood_type_idx on products (status, wood_type_id);
create index products_status_created_at_idx on products (status, created_at desc);

-- -----------------------------------------------------------------------------
-- product_images — ordered gallery per product, backed by Supabase Storage.
-- -----------------------------------------------------------------------------

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  storage_path text not null,
  alt_text text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on product_images (product_id, position);

-- -----------------------------------------------------------------------------
-- custom_order_inquiries — the core "secure custom order inquiry" loop.
-- -----------------------------------------------------------------------------

create table custom_order_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  artist_id uuid not null references artist_profiles (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  status inquiry_status not null default 'new',
  budget_min_cents integer check (budget_min_cents is null or budget_min_cents >= 0),
  budget_max_cents integer check (budget_max_cents is null or budget_max_cents >= 0),
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger custom_order_inquiries_set_updated_at
  before update on custom_order_inquiries
  for each row execute function set_updated_at();

create index inquiries_customer_id_idx on custom_order_inquiries (customer_id);
create index inquiries_artist_id_idx on custom_order_inquiries (artist_id, status);

-- inquiry_status_history — append-only funnel log for analytics dashboards
-- (time-to-quote, conversion rate, drop-off stage, etc).

create table inquiry_status_history (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references custom_order_inquiries (id) on delete cascade,
  old_status inquiry_status,
  new_status inquiry_status not null,
  changed_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inquiry_status_history_inquiry_id_idx on inquiry_status_history (inquiry_id, created_at);

create function log_inquiry_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into inquiry_status_history (inquiry_id, old_status, new_status, changed_by)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger custom_order_inquiries_log_status
  after insert or update on custom_order_inquiries
  for each row execute function log_inquiry_status_change();

-- -----------------------------------------------------------------------------
-- inquiry_messages — threaded messages tied to a single inquiry.
-- -----------------------------------------------------------------------------

create table inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references custom_order_inquiries (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index inquiry_messages_inquiry_id_idx on inquiry_messages (inquiry_id, created_at);

-- -----------------------------------------------------------------------------
-- orders / order_items — minimal checkout data flow (Phase 5).
-- -----------------------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references custom_order_inquiries (id) on delete set null,
  customer_id uuid not null references profiles (id) on delete cascade,
  artist_id uuid not null references artist_profiles (id) on delete cascade,
  status order_status not null default 'pending',
  total_price_cents integer not null check (total_price_cents >= 0),
  currency text not null default 'usd',
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

create index orders_customer_id_idx on orders (customer_id);
create index orders_artist_id_idx on orders (artist_id, status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on order_items (order_id);

-- -----------------------------------------------------------------------------
-- product_views — raw analytics event stream. Denormalized artist_id avoids a
-- join through products for artist-level dashboards.
-- -----------------------------------------------------------------------------

create table product_views (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  artist_id uuid not null references artist_profiles (id) on delete cascade,
  viewer_id uuid references profiles (id) on delete set null,
  session_id text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index product_views_product_id_created_at_idx on product_views (product_id, created_at desc);
create index product_views_artist_id_created_at_idx on product_views (artist_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security — enabled everywhere now; policies land in Phase 2.
-- -----------------------------------------------------------------------------

alter table profiles enable row level security;
alter table artist_profiles enable row level security;
alter table wood_types enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table custom_order_inquiries enable row level security;
alter table inquiry_status_history enable row level security;
alter table inquiry_messages enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table product_views enable row level security;
