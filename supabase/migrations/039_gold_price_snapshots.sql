-- 039: one row a day of what we pay for gold, per carat
--
-- Feeds the 30 / 90 day "9ct gold price per gram" chart on /gold-calculator.
-- Search Console (Sep to Oct 2026) shows "9ct gold price per gram" and "9ct
-- gold price uk" at position 37 to 47: the page answered today's figure but
-- nothing about where the price has been, which is what those searches want.
--
-- Rows are written by the server only (service role): a daily Vercel cron at
-- /api/cron/gold-snapshot, plus the calculator page itself when today's row
-- is missing. The first run backfills about 90 days from the price API using
-- today's paying rate as the ratio to spot, so the chart is full from day one.
--
-- Safe to run more than once. Until it is applied the chart falls back to the
-- price API's own history and nothing is stored.

create table if not exists public.gold_price_snapshots (
  -- Calendar day in London time, one row per day.
  snapshot_date date primary key,
  -- Pure (24ct) gold, pounds per gram, at the time of the snapshot.
  spot_gbp_per_gram numeric(10,4) not null,
  -- What we pay per gram for each carat, as shown on the calculator that day.
  price_9ct numeric(10,4),
  price_14ct numeric(10,4),
  price_18ct numeric(10,4),
  price_22ct numeric(10,4),
  price_24ct numeric(10,4),
  -- 'live' = recorded on the day; 'backfill' = reconstructed from API history.
  source text not null default 'live' check (source in ('live', 'backfill')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_touch_gold_price_snapshots on public.gold_price_snapshots;
create trigger trg_touch_gold_price_snapshots before update on public.gold_price_snapshots
  for each row execute function public.tg_touch_updated_at();

alter table public.gold_price_snapshots enable row level security;
drop policy if exists gold_price_snapshots_read on public.gold_price_snapshots;
drop policy if exists gold_price_snapshots_write on public.gold_price_snapshots;
-- Anyone may read (the chart is public); only admins or the service role may write.
create policy gold_price_snapshots_read on public.gold_price_snapshots for select using (true);
create policy gold_price_snapshots_write on public.gold_price_snapshots
  for all using (public.is_admin()) with check (public.is_admin());
