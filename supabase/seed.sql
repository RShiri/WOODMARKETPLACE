-- =============================================================================
-- BrickCase — Seed Data
-- Applied automatically by `supabase db reset` / `supabase start`, or
-- manually via `psql -f supabase/seed.sql`. Safe to re-run (upserts).
-- =============================================================================

-- Calibrated against a real Israeli acrylic-case seller's public price list
-- (₪250 for a ~45cm Batmobile case up to ₪300 for a ~63cm Technic F1 case),
-- back-solved so lib/pricing/engine.ts lands within a few percent of those
-- real prices across that size range — not a guess. See the pricing engine
-- tests (lib/pricing/engine.test.ts) for the worked numbers. Material rates
-- below scale roughly linearly with thickness through 5mm, same shape as
-- before, just at a realistic overall level (previous values were ~6x too
-- low — literally "illustrative," not sourced from anything). The 6mm
-- oversized tier deliberately breaks that linearity; see its note below.
insert into pricing_config (
  id, currency, margin_pct, min_margin_cents, assembly_fee_cents,
  base_led_fee_cents, min_price_cents, rounding_step_cents,
  oversize_threshold_mm, max_dim_mm
) values (
  1, 'ils', 0.20, 3000, 6000,
  8000, 8000, 500,
  1000, 1500
)
on conflict (id) do nothing;

-- Material rates by thickness, in agorot (ILS cents).
-- Guarded on (material, thickness_mm) rather than ON CONFLICT: the table's
-- unique key includes effective_from, which defaults to now(), so a plain
-- upsert never actually conflicts and every re-run would append a duplicate
-- generation of every rate. Deliberate price *changes* are still inserted as
-- new effective_from rows by hand; this block only ever establishes the
-- baseline once.
insert into material_costs (material, thickness_mm, cost_per_m2_cents, cut_cost_per_m_cents)
select v.material, v.thickness_mm, v.cost_per_m2_cents, v.cut_cost_per_m_cents
from (values
  ('acrylic_clear'::text, 3::smallint, 10800, 900),
  ('acrylic_clear', 4, 13800, 1020),
  ('acrylic_clear', 5, 17400, 1140),
  ('acrylic_black', 3, 12600, 900),
  ('acrylic_black', 4, 15600, 1020),
  ('acrylic_black', 5, 19200, 1140),
  ('acrylic_frosted', 3, 13200, 900),
  ('acrylic_frosted', 4, 16200, 1020),
  ('acrylic_frosted', 5, 19800, 1140),
  -- 6mm is the oversized tier (boxes over 1000mm). Priced as a premium step,
  -- not a linear one: linear extrapolation of the ladder above (+4200/m2,
  -- +120/m cut) multiplied by 1.15 on material and 1.35 on cutting, for
  -- low-volume premium cast stock and materially slower cutting passes.
  -- Derivation and the test that pins it: supabase/migrations/0010_oversized_boxes.sql.
  ('acrylic_clear', 6, 24800, 1700),
  ('acrylic_black', 6, 26900, 1700),
  ('acrylic_frosted', 6, 27600, 1700)
) as v(material, thickness_mm, cost_per_m2_cents, cut_cost_per_m_cents)
where not exists (
  select 1 from material_costs mc
  where mc.material = v.material and mc.thickness_mm = v.thickness_mm
);

insert into box_gallery (title, length_mm, width_mm, height_mm, blurb, sort_order)
values
  ('Modular Building Case', 480, 320, 380, 'A clear 5-panel case sized for a street-modular build, LED base upgrade shown.', 1),
  ('Starship Display', 620, 260, 300, 'Long-format case for ship builds — 4mm walls for extra rigidity at this span.', 2),
  ('Minifigure Shelf Box', 220, 90, 140, 'Compact black-base case for single minifigure display, our most-ordered size.', 3),
  ('Castle Display', 400, 400, 350, 'Square-footprint case for symmetric builds like castles and towers.', 4),
  ('Vehicle Display', 300, 180, 200, 'Snug clearance around a car or truck build, frosted base for a showroom look.', 5),
  ('Large Diorama Case', 700, 500, 420, 'Our largest standard case — 5mm panels throughout for a diorama build.', 6)
on conflict do nothing;

-- A handful of pre-cached famous sets so the calculator's set-id lookup has
-- instant results out of the box. Dimensions here are approximate
-- (source='manual', confidence='estimated') — replace with exact
-- Brickset-sourced rows once BRICKSET_API_KEY is configured; the resolver
-- always prefers a fresher/exact cache row when one exists.
insert into lego_sets_cache (set_id, name, length_mm, width_mm, height_mm, piece_count, theme, source, confidence)
values
  ('10294-1', 'Titanic', 1350, 160, 440, 9090, 'Icons', 'manual', 'estimated'),
  ('75192-1', 'Millennium Falcon', 840, 560, 210, 7541, 'Star Wars', 'manual', 'estimated'),
  ('10276-1', 'Colosseum', 660, 500, 260, 9036, 'Icons', 'manual', 'estimated'),
  ('10281-1', 'Bonsai Tree', 180, 260, 260, 878, 'Icons', 'manual', 'estimated'),
  ('21058-1', 'Great Pyramid of Giza', 400, 400, 250, 1476, 'Architecture', 'manual', 'estimated')
on conflict (set_id) do nothing;
