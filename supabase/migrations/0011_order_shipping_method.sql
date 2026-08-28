-- =============================================================================
-- BrickCase — Order-level Shipping Method
-- 0010 froze shipping_method on the quote, but an order is what fulfilment
-- actually picks up, and orders can hold several quotes (the cart). Without
-- this, spotting a freight order meant joining back to every line's quote and
-- re-deriving the answer.
--
-- An order is freight if ANY of its lines is: one 1.2m panel sets the whole
-- shipment's handling, so this is a max() across lines, not per line.
--
-- Backfills existing orders from the quotes they already reference, so a
-- historical order that happened to be oversized reads correctly too. That
-- can only ever find 'standard' today, since 0010 shipped alongside the first
-- code that could produce an oversized quote at all — but it keeps the column
-- honest rather than assuming.
-- =============================================================================

alter table orders
  add column shipping_method text not null default 'standard'
    check (shipping_method in ('standard', 'oversized_freight'));

comment on column orders.shipping_method is
  'oversized_freight when any line of the order is over pricing_config.oversize_threshold_mm; else standard. Frozen at checkout from the quotes, like total_price_cents and currency.';

-- Backfill from the order's own lines, then from the legacy single quote_id
-- for any order predating order_items.
update orders o
set shipping_method = 'oversized_freight'
where exists (
  select 1
  from order_items oi
  join quotes q on q.id = oi.quote_id
  where oi.order_id = o.id
    and q.shipping_method = 'oversized_freight'
);

update orders o
set shipping_method = 'oversized_freight'
where o.shipping_method = 'standard'
  and exists (
    select 1 from quotes q
    where q.id = o.quote_id and q.shipping_method = 'oversized_freight'
  );

create index orders_shipping_method_idx on orders (shipping_method)
  where shipping_method = 'oversized_freight';
