-- =============================================================================
-- BrickCase — Seed Data
-- Applied automatically by `supabase db reset` / `supabase start`, or
-- manually via `psql -f supabase/seed.sql`. Safe to re-run (upserts).
-- =============================================================================

insert into pricing_config (id, currency) values (1, 'ils')
  on conflict (id) do nothing;

-- Material rates by thickness, in agorot (ILS cents). Illustrative starting
-- points for the demo, not a real supplier quote — tune via the
-- pricing_config / material_costs tables once real material costs are known.
insert into material_costs (material, thickness_mm, cost_per_m2_cents, cut_cost_per_m_cents)
values
  ('acrylic_clear', 3, 1800, 150),
  ('acrylic_clear', 4, 2300, 170),
  ('acrylic_clear', 5, 2900, 190),
  ('acrylic_black', 3, 2100, 150),
  ('acrylic_black', 4, 2600, 170),
  ('acrylic_black', 5, 3200, 190),
  ('acrylic_frosted', 3, 2200, 150),
  ('acrylic_frosted', 4, 2700, 170),
  ('acrylic_frosted', 5, 3300, 190)
on conflict (material, thickness_mm, effective_from) do nothing;

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
