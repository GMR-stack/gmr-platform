-- Team payment cards: one row per registered PortOne billing key (card) per
-- team. The subscription's portone_billing_key column stays the single source
-- of truth for which card the monthly batch charges — this table is the pool
-- of registered cards the billing admin can pick from.
--
-- Run this in the Cardlogue Supabase SQL editor (gmr-platform server accesses
-- it with the service role key only; RLS is enabled with no policies so app
-- clients can't touch it directly).

create table if not exists public.team_payment_cards (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  billing_key text not null unique,
  -- Snapshot of PortOne's billing-key lookup at registration time (issuer /
  -- masked number), so listing cards doesn't need one PortOne API call per
  -- card. Nullable: backfilled rows below start empty and are filled lazily
  -- by the server the first time the list is fetched.
  card_name text,
  card_number_masked text,
  created_by uuid,
  created_at timestamptz not null default now(),
  -- Soft delete: the row is kept (billing_key stays unique, payment history
  -- stays traceable) but the card disappears from the list.
  deleted_at timestamptz
);

create index if not exists team_payment_cards_team_id_idx
  on public.team_payment_cards (team_id);

alter table public.team_payment_cards enable row level security;

-- Backfill: every team subscription that already has a PortOne billing key
-- gets that card as its first (and currently active) registered card.
insert into public.team_payment_cards (team_id, billing_key, created_by)
select team_id, portone_billing_key, user_id
from public.subscriptions
where type = 'team' and portone_billing_key is not null
on conflict (billing_key) do nothing;
