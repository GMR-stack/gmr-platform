-- Lets the PortOne webhook map a Transaction.Cancelled event back to the
-- team subscription it paid for, so a refund issued directly in PortOne's
-- console (not through our own /cancel API) also deactivates the
-- subscription instead of silently leaving it active.
--
-- Run this in the Cardlogue Supabase SQL editor.

alter table public.subscriptions
  add column if not exists last_payment_id text;

create index if not exists subscriptions_last_payment_id_idx
  on public.subscriptions (last_payment_id);
