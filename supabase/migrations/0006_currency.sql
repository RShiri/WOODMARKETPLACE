-- =============================================================================
-- BrickCase — Configurable Currency (default ILS)
-- Currency was hardcoded 'usd' throughout the app. Makes it a real setting:
-- pricing_config.currency is the shop's base currency; quotes freeze it at
-- creation time (like their price) so a later currency change doesn't
-- retroactively relabel an old quote; orders inherit it from their quote.
-- Defaults to ILS — ARCHITECTURE.md and PLAN.md both flagged the Hebrew/RTL
-- audience as more likely Israeli than USD.
-- =============================================================================

alter table pricing_config add column currency text not null default 'ils';
alter table quotes add column currency text not null default 'ils';
alter table orders alter column currency set default 'ils';
