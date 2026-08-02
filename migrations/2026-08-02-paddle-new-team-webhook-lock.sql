-- Paddle redelivers webhook events for the same purchase (transaction.completed,
-- then subscription.created/activated) — sometimes concurrently — so a plain
-- "select first, then insert if nothing found" check in application code is a
-- race condition: multiple concurrent deliveries can all pass the check
-- before any of them has inserted, each creating its own duplicate team.
--
-- This table is used purely as an atomic claim: `insert ... on conflict do
-- nothing`, and only whichever request's insert actually lands (Postgres
-- guarantees exactly one winner under the unique constraint) proceeds to
-- create the team. Losers see no returned row and skip.
--
-- Run this in the Cardlogue Supabase SQL editor.

create table if not exists public.paddle_new_team_webhook_locks (
  paddle_subscription_id text primary key,
  created_at timestamptz not null default now()
);
