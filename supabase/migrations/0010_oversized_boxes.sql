-- =============================================================================
-- BrickCase — Oversized Boxes, 6mm Tier & BrickLink Source
-- Three related changes so the engine can quote spans it previously refused:
--
--   1. A 6mm material tier. THICKNESS_TIERS in lib/pricing/engine.ts now
--      selects 6mm above 1000mm, so material_costs needs matching rows or
--      every oversized quote throws "No active material rate".
--   2. A hybrid size boundary. max_dim_mm moves 1000 -> 1500 so boxes in the
--      1001-1500mm band price automatically (at 6mm, freight-flagged, with a
--      structural warning in the UI). Above 1500mm stays a hard rejection
--      that the calculator turns into a "custom engineered quote" CTA.
--      oversize_threshold_mm is the new 1000mm line where that band starts —
--      separate from max_dim_mm so the warning threshold and the engine
--      ceiling can move independently.
--   3. quotes.shipping_method, frozen per quote like price and currency, so
--      fulfilment can see a freight box without re-deriving it from
--      dimensions and a later threshold change can't relabel old quotes.
--
-- Also widens lego_sets_cache.source for the BrickLink resolver tier.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Size boundary config
-- -----------------------------------------------------------------------------

alter table pricing_config
  add column oversize_threshold_mm smallint not null default 1000
    check (oversize_threshold_mm > 0);

comment on column pricing_config.oversize_threshold_mm is
  'Longest-dimension line (mm) above which a box is treated as oversized: 6mm acrylic, freight shipping, structural warning shown. Must be <= max_dim_mm.';

alter table pricing_config
  alter column max_dim_mm set default 1500;

comment on column pricing_config.max_dim_mm is
  'Hard ceiling (mm) for automated quoting. Above this the engine refuses and the UI offers a custom engineered quote instead.';

-- The singleton row keeps whatever value it was seeded with, so move it
-- explicitly to the new ceiling.
update pricing_config set max_dim_mm = 1500 where id = 1 and max_dim_mm < 1500;

alter table pricing_config
  add constraint pricing_config_oversize_below_max
    check (oversize_threshold_mm <= max_dim_mm);

-- -----------------------------------------------------------------------------
-- 2. 6mm material rates
--
-- Deliberately NOT a linear extension of the 3/4/5mm ladder. Those rates run
-- ~34.50-36.00 ILS per m2 per mm of thickness, i.e. roughly proportional to
-- volume. 6mm cast sheet breaks that pattern twice over: it is a lower-volume
-- premium stock with worse sheet yield, and it cuts far slower — a 6mm pass
-- needs materially more machine time per metre than the 5mm pass, not 5/6ths
-- more. So each 6mm rate is built as:
--
--   linear_extrapolation x premium_multiplier
--
-- where linear_extrapolation continues the existing +3000 / +3600 material
-- delta progression (next step +4200) and the cut cost's flat +120/m step,
-- and the premium multiplier is 1.15 on material and 1.35 on cutting.
-- Rounded to the nearest 100 agorot. lib/pricing/engine.test.ts asserts these
-- seeded values against that formula so the strategy stays visible in code.
--
--   acrylic_clear    (17400 + 4200) x 1.15 = 24840 -> 24800
--   acrylic_black    (19200 + 4200) x 1.15 = 26910 -> 26900
--   acrylic_frosted  (19800 + 4200) x 1.15 = 27600 -> 27600
--   cut (all)        ( 1140 +  120) x 1.35 =  1701 ->  1700
--
-- Net effect vs 5mm: material x1.43-1.40, cutting x1.49 — a genuine premium
-- tier rather than a proportional one.
-- -----------------------------------------------------------------------------

-- Guarded on (material, thickness_mm), not ON CONFLICT: the unique key
-- includes effective_from, which defaults to now(), so an upsert here would
-- never conflict with the same rows seeded by supabase/seed.sql and a
-- `db reset` (migrations then seed) would leave two generations of every 6mm
-- rate behind.
insert into material_costs (material, thickness_mm, cost_per_m2_cents, cut_cost_per_m_cents)
select v.material, v.thickness_mm, v.cost_per_m2_cents, v.cut_cost_per_m_cents
from (values
  ('acrylic_clear'::text, 6::smallint, 24800, 1700),
  ('acrylic_black', 6, 26900, 1700),
  ('acrylic_frosted', 6, 27600, 1700)
) as v(material, thickness_mm, cost_per_m2_cents, cut_cost_per_m_cents)
where not exists (
  select 1 from material_costs mc
  where mc.material = v.material and mc.thickness_mm = v.thickness_mm
);

-- -----------------------------------------------------------------------------
-- 3. Per-quote shipping method
-- -----------------------------------------------------------------------------

alter table quotes
  add column shipping_method text not null default 'standard'
    check (shipping_method in ('standard', 'oversized_freight'));

comment on column quotes.shipping_method is
  'Frozen at quote creation from the box''s longest dimension: oversized_freight above pricing_config.oversize_threshold_mm, else standard.';

create index quotes_shipping_method_idx on quotes (shipping_method)
  where shipping_method = 'oversized_freight';

-- -----------------------------------------------------------------------------
-- 4. BrickLink as a resolver source
-- -----------------------------------------------------------------------------

alter table lego_sets_cache
  drop constraint lego_sets_cache_source_check;

alter table lego_sets_cache
  add constraint lego_sets_cache_source_check
    check (source in ('brickset', 'bricklink', 'rebrickable', 'estimated', 'manual'));
