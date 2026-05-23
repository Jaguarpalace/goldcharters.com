-- Deduplicate items_we_buy and stop future duplicates.
--
-- Why: the original schema didn't enforce uniqueness on `name`, so running
-- a seed/migration twice creates duplicate rows like "Hermès handbags ×2".
-- This migration cleans the table and adds a UNIQUE constraint so future
-- inserts of the same name are rejected automatically.
--
-- Run in Supabase → SQL Editor.

-- 1. Delete duplicates, keeping the row with the lowest display_order per name
--    (and lowest id as a tiebreaker if display_order ties).
with ranked as (
  select
    id,
    row_number() over (
      partition by name
      order by display_order asc, id asc
    ) as rn
  from public.items_we_buy
)
delete from public.items_we_buy
where id in (select id from ranked where rn > 1);

-- 2. Add a unique constraint so this can never happen again.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'items_we_buy_name_key'
      and conrelid = 'public.items_we_buy'::regclass
  ) then
    alter table public.items_we_buy
      add constraint items_we_buy_name_key unique (name);
  end if;
end $$;
