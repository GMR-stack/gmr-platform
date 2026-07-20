-- Rescopes team_payment_cards from "per team" to "per Cardlogue account" —
-- a registered card belongs to the person who registered it, reusable
-- across every team they administer, not locked to the one team it was
-- first registered under. Billing itself stays per-team
-- (subscriptions.portone_billing_key), this only changes which cards show
-- up in the picker.
--
-- Run this in the Cardlogue Supabase SQL editor, after
-- 2026-07-19-team-payment-cards.sql.

alter table public.team_payment_cards
  alter column team_id drop not null;

-- created_by already holds the registering user's id (server always set it)
-- — this is now the scoping column for "which cards does this user see."
-- Not forced NOT NULL here in case any pre-existing row lacks it; such a row
-- just won't surface in any user's card list, which is a safe degradation.
create index if not exists team_payment_cards_created_by_idx
  on public.team_payment_cards (created_by);
