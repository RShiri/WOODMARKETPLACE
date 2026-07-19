-- =============================================================================
-- Woodworking Marketplace — Row Level Security Policies
-- Phase 2: Defines the access-control matrix for every table enabled for RLS
-- in 0001_init.sql. Policies favor explicit, narrow grants: public read access
-- is limited to data that is genuinely storefront/public-facing, writes are
-- scoped to the owning party (customer/artist) or to admins for curated
-- taxonomy tables, and append-only/immutable logs deliberately omit UPDATE
-- and/or DELETE policies so no role can alter or erase history.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- Public read (names/avatars/roles power storefronts and inquiry threads).
-- Row owner may update their own profile. No public INSERT (handle_new_user
-- trigger is security definer and bypasses RLS). No DELETE policy.
-- -----------------------------------------------------------------------------

create policy "profiles_select_all"
  on profiles for select
  to public
  using (true);

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- artist_profiles
-- Public read (artist storefronts). Only a caller whose profile role is
-- 'artist' may create their own artist_profiles row. Owner may update/delete.
-- -----------------------------------------------------------------------------

create policy "artist_profiles_select_all"
  on artist_profiles for select
  to public
  using (true);

create policy "artist_profiles_insert_own_if_artist"
  on artist_profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'artist'
    )
  );

create policy "artist_profiles_update_own"
  on artist_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "artist_profiles_delete_own"
  on artist_profiles for delete
  to authenticated
  using (id = auth.uid());

-- -----------------------------------------------------------------------------
-- wood_types
-- Curated taxonomy: public read, admin-only writes.
-- -----------------------------------------------------------------------------

create policy "wood_types_select_all"
  on wood_types for select
  to public
  using (true);

create policy "wood_types_insert_admin"
  on wood_types for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "wood_types_update_admin"
  on wood_types for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "wood_types_delete_admin"
  on wood_types for delete
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- categories
-- Curated taxonomy: public read, admin-only writes.
-- -----------------------------------------------------------------------------

create policy "categories_select_all"
  on categories for select
  to public
  using (true);

create policy "categories_insert_admin"
  on categories for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "categories_update_admin"
  on categories for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "categories_delete_admin"
  on categories for delete
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- products
-- Published products are public; artists can also see their own drafts and
-- archived products. Writes are restricted to the owning artist, and only
-- while their profile role is still 'artist'.
-- -----------------------------------------------------------------------------

create policy "products_select_published_or_own"
  on products for select
  to public
  using (
    status = 'published'
    or artist_id = auth.uid()
  );

create policy "products_insert_own_if_artist"
  on products for insert
  to authenticated
  with check (
    artist_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'artist'
    )
  );

create policy "products_update_own_if_artist"
  on products for update
  to authenticated
  using (
    artist_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'artist'
    )
  )
  with check (
    artist_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'artist'
    )
  );

create policy "products_delete_own_if_artist"
  on products for delete
  to authenticated
  using (
    artist_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'artist'
    )
  );

-- -----------------------------------------------------------------------------
-- product_images
-- Visibility mirrors the parent product's visibility. Writes are restricted
-- to the artist who owns the parent product.
-- -----------------------------------------------------------------------------

create policy "product_images_select_published_or_own"
  on product_images for select
  to public
  using (
    exists (
      select 1 from products
      where products.id = product_images.product_id
        and (
          products.status = 'published'
          or products.artist_id = auth.uid()
        )
    )
  );

create policy "product_images_insert_own_product"
  on product_images for insert
  to authenticated
  with check (
    exists (
      select 1 from products
      where products.id = product_images.product_id
        and products.artist_id = auth.uid()
    )
  );

create policy "product_images_update_own_product"
  on product_images for update
  to authenticated
  using (
    exists (
      select 1 from products
      where products.id = product_images.product_id
        and products.artist_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from products
      where products.id = product_images.product_id
        and products.artist_id = auth.uid()
    )
  );

create policy "product_images_delete_own_product"
  on product_images for delete
  to authenticated
  using (
    exists (
      select 1 from products
      where products.id = product_images.product_id
        and products.artist_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- custom_order_inquiries
-- Both parties (customer and artist) can see and update an inquiry. Only
-- customers may initiate new inquiries. Never hard-deleted (use
-- status = 'cancelled' instead), so no DELETE policy.
-- -----------------------------------------------------------------------------

create policy "custom_order_inquiries_select_party"
  on custom_order_inquiries for select
  to authenticated
  using (
    customer_id = auth.uid()
    or artist_id = auth.uid()
  );

create policy "custom_order_inquiries_insert_own_if_customer"
  on custom_order_inquiries for insert
  to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'customer'
    )
  );

create policy "custom_order_inquiries_update_party"
  on custom_order_inquiries for update
  to authenticated
  using (
    customer_id = auth.uid()
    or artist_id = auth.uid()
  )
  with check (
    customer_id = auth.uid()
    or artist_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- inquiry_status_history
-- Append-only audit log. Readable/insertable only by parties of the related
-- inquiry. The row is actually written by the log_inquiry_status_change
-- trigger, which runs with the caller's own UPDATE privileges — already
-- gated by the custom_order_inquiries UPDATE policy above — so this INSERT
-- policy is a consistent secondary guard. No UPDATE or DELETE policy: this
-- table is strictly immutable.
-- -----------------------------------------------------------------------------

create policy "inquiry_status_history_select_party"
  on inquiry_status_history for select
  to authenticated
  using (
    exists (
      select 1 from custom_order_inquiries
      where custom_order_inquiries.id = inquiry_status_history.inquiry_id
        and (
          custom_order_inquiries.customer_id = auth.uid()
          or custom_order_inquiries.artist_id = auth.uid()
        )
    )
  );

create policy "inquiry_status_history_insert_party"
  on inquiry_status_history for insert
  to authenticated
  with check (
    exists (
      select 1 from custom_order_inquiries
      where custom_order_inquiries.id = inquiry_status_history.inquiry_id
        and (
          custom_order_inquiries.customer_id = auth.uid()
          or custom_order_inquiries.artist_id = auth.uid()
        )
    )
  );

-- -----------------------------------------------------------------------------
-- inquiry_messages
-- Readable by both parties of the related inquiry. Only the sender may
-- insert a message, and only while they are a party to the inquiry. Updates
-- (e.g. marking read_at) are allowed for either party; note that RLS cannot
-- restrict which *columns* an UPDATE touches, so preventing a party from
-- editing the other party's message body (as opposed to just read_at) must
-- be enforced at the application layer. No DELETE policy.
-- -----------------------------------------------------------------------------

create policy "inquiry_messages_select_party"
  on inquiry_messages for select
  to authenticated
  using (
    exists (
      select 1 from custom_order_inquiries
      where custom_order_inquiries.id = inquiry_messages.inquiry_id
        and (
          custom_order_inquiries.customer_id = auth.uid()
          or custom_order_inquiries.artist_id = auth.uid()
        )
    )
  );

create policy "inquiry_messages_insert_own_if_party"
  on inquiry_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from custom_order_inquiries
      where custom_order_inquiries.id = inquiry_messages.inquiry_id
        and (
          custom_order_inquiries.customer_id = auth.uid()
          or custom_order_inquiries.artist_id = auth.uid()
        )
    )
  );

-- Column-level restriction (e.g. only allowing the recipient to set read_at,
-- not edit body) is NOT enforced by this policy — RLS operates on rows, not
-- columns. That distinction is expected to be enforced at the application
-- layer.
create policy "inquiry_messages_update_party"
  on inquiry_messages for update
  to authenticated
  using (
    exists (
      select 1 from custom_order_inquiries
      where custom_order_inquiries.id = inquiry_messages.inquiry_id
        and (
          custom_order_inquiries.customer_id = auth.uid()
          or custom_order_inquiries.artist_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from custom_order_inquiries
      where custom_order_inquiries.id = inquiry_messages.inquiry_id
        and (
          custom_order_inquiries.customer_id = auth.uid()
          or custom_order_inquiries.artist_id = auth.uid()
        )
    )
  );

-- -----------------------------------------------------------------------------
-- orders
-- Readable/updatable by both parties (customer and artist). Only the
-- customer may create an order. No DELETE policy.
-- -----------------------------------------------------------------------------

create policy "orders_select_party"
  on orders for select
  to authenticated
  using (
    customer_id = auth.uid()
    or artist_id = auth.uid()
  );

create policy "orders_insert_own"
  on orders for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy "orders_update_party"
  on orders for update
  to authenticated
  using (
    customer_id = auth.uid()
    or artist_id = auth.uid()
  )
  with check (
    customer_id = auth.uid()
    or artist_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- order_items
-- Readable/insertable by parties of the related order. Line items are
-- immutable once created, so no UPDATE or DELETE policy.
-- -----------------------------------------------------------------------------

create policy "order_items_select_party"
  on order_items for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and (
          orders.customer_id = auth.uid()
          or orders.artist_id = auth.uid()
        )
    )
  );

create policy "order_items_insert_party"
  on order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and (
          orders.customer_id = auth.uid()
          or orders.artist_id = auth.uid()
        )
    )
  );

-- -----------------------------------------------------------------------------
-- product_views
-- Public, write-only analytics event stream: anyone (including anonymous
-- visitors) may record a view. Only the owning artist or an admin may read
-- the event log. No UPDATE or DELETE policy: this table is immutable.
-- -----------------------------------------------------------------------------

create policy "product_views_insert_all"
  on product_views for insert
  to public
  with check (true);

create policy "product_views_select_own_or_admin"
  on product_views for select
  to authenticated
  using (
    artist_id = auth.uid()
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
