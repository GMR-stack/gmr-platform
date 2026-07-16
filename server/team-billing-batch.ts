import {
  chargeBillingKey,
  getPaymentStatus,
  calcNextBillingAt,
  getCardlogueSupabase,
  TEAM_SEAT_PRICE_KRW,
} from "./portone";
import { updateSubscriptionRecurringPrice, getPaddleSeatUnitPriceCents } from "./paddle";

type DueSubscription = {
  id: string;
  team_id: string;
  slot_count: number;
  next_billing_at: string;
  pending_cancellation: boolean | null;
  portone_billing_key: string | null;
  paddle_subscription_id: string | null;
};

async function runPortoneCycle(supabase: ReturnType<typeof getCardlogueSupabase>) {
  const { data: due, error } = await supabase
    .from("subscriptions")
    .select("id, team_id, slot_count, next_billing_at, pending_cancellation, portone_billing_key, paddle_subscription_id")
    .eq("type", "team")
    .eq("status", "active")
    .not("portone_billing_key", "is", null)
    .lte("next_billing_at", new Date().toISOString());
  if (error) throw error;

  for (const sub of (due as DueSubscription[]) ?? []) {
    try {
      if (sub.pending_cancellation) {
        const { error: writeErr } = await supabase
          .from("subscriptions")
          .update({ status: "expired", pending_cancellation: false })
          .eq("id", sub.id);
        if (writeErr) throw writeErr;
        continue;
      }

      const billingKey = sub.portone_billing_key as string;
      const scheduledAt = new Date(sub.next_billing_at);
      const amount = sub.slot_count * TEAM_SEAT_PRICE_KRW;
      // Scoped to this billing cycle (the scheduled date) so a retry within
      // the same cycle dedupes against PortOne's own duplicate-payment guard,
      // but next month's legitimate charge gets a distinct id.
      const paymentId = `team-recur-${sub.team_id}-${billingKey}-${sub.next_billing_at}`;

      try {
        await chargeBillingKey({
          paymentId,
          billingKey,
          orderName: `Cardlogue 팀 플랜 (${sub.slot_count}인)`,
          amount,
          customerName: "Cardlogue Team",
        });
      } catch (chargeErr: any) {
        const existingPayment = await getPaymentStatus(paymentId).catch(() => null);
        if (existingPayment?.status !== "PAID") throw chargeErr;
      }

      // Anchored to the scheduled date, not "now" — a late batch run must
      // not drift the monthly cadence forward.
      const { error: writeErr } = await supabase
        .from("subscriptions")
        .update({ next_billing_at: calcNextBillingAt(scheduledAt).toISOString() })
        .eq("id", sub.id);
      if (writeErr) throw writeErr;
    } catch (err: any) {
      console.error(`Team billing (PortOne) recurring charge failed for subscription ${sub.id}:`, err.message);
    }
  }
}

async function runPaddlePriceSync(supabase: ReturnType<typeof getCardlogueSupabase>) {
  const { data: due, error } = await supabase
    .from("subscriptions")
    .select("id, team_id, slot_count, next_billing_at, pending_cancellation, portone_billing_key, paddle_subscription_id")
    .eq("type", "team")
    .eq("status", "active")
    .eq("pending_cancellation", false)
    .not("paddle_subscription_id", "is", null)
    .lte("next_billing_at", new Date().toISOString());
  if (error) throw error;

  const unitPriceCents = getPaddleSeatUnitPriceCents();
  for (const sub of (due as DueSubscription[]) ?? []) {
    try {
      // Syncs the recurring price to the current slot_count (covers a
      // decrease that was applied immediately but deliberately left the
      // price untouched until renewal). Paddle itself performs the actual
      // charge and advances next_billing_at via the webhook's
      // subscription_recurring branch, not this batch.
      await updateSubscriptionRecurringPrice({
        subscriptionId: sub.paddle_subscription_id as string,
        slots: sub.slot_count,
        totalCents: sub.slot_count * unitPriceCents,
      });
    } catch (err: any) {
      console.error(`Team billing (Paddle) price sync failed for subscription ${sub.id}:`, err.message);
    }
  }
}

export async function runTeamBillingCycle() {
  const supabase = getCardlogueSupabase();
  await runPortoneCycle(supabase);
  await runPaddlePriceSync(supabase);
}
