-- Run this once in your Supabase project's SQL Editor.
-- In Supabase Authentication > Providers > Anonymous Sign-Ins, enable anonymous users.
-- Ballots are public to read because this is a small-group poll.
-- Only the anonymous account that created a ballot can modify it.

create or replace function public.valid_company_choices(p integer[])
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(
    cardinality(p) between 1 and 10
    and (select count(distinct n) from unnest(p) as n) = cardinality(p)
    and (select bool_and(n between 1 and 26) from unnest(p) as n),
    false
  );
$$;

create table if not exists public.company_ballots (
  voter_key text primary key,
  display_name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_ids integer[] not null,
  updated_at timestamptz not null default now(),
  constraint voter_name_valid check (
    char_length(btrim(display_name)) between 2 and 40
    and voter_key = lower(btrim(display_name))
  ),
  constraint choices_valid check (public.valid_company_choices(company_ids))
);

create index if not exists company_ballots_owner_idx on public.company_ballots(owner_id);
alter table public.company_ballots enable row level security;

drop policy if exists "Read team poll results" on public.company_ballots;
create policy "Read team poll results"
on public.company_ballots for select to anon, authenticated
using (true);

drop policy if exists "Members create own ballots" on public.company_ballots;
create policy "Members create own ballots"
on public.company_ballots for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Members edit own ballots" on public.company_ballots;
create policy "Members edit own ballots"
on public.company_ballots for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.company_ballots to anon, authenticated;
grant insert, update on public.company_ballots to authenticated;
