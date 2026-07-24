-- =============================================================================
-- BrickCase — Rate Limiting
-- Fixed-window rate limiter backed by Postgres rather than a new external
-- dependency (Redis/Upstash) — this app already requires Supabase, and a
-- DB-backed limiter works correctly across serverless instances, unlike an
-- in-memory counter. increment_rate_limit() is a single atomic upsert so
-- concurrent requests in the same window can't race past the limit.
-- =============================================================================

create table rate_limit_hits (
  bucket_key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (bucket_key, window_start)
);

alter table rate_limit_hits enable row level security;
-- No public/authenticated policies, same reasoning as quotes/wa_sessions:
-- only server-side code using the service role should ever touch this.

create function increment_rate_limit(p_bucket_key text, p_window_start timestamptz)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into rate_limit_hits (bucket_key, window_start, count)
  values (p_bucket_key, p_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set count = rate_limit_hits.count + 1
  returning count into new_count;
  return new_count;
end;
$$;
