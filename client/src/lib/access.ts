import type { Report, Subscription, User } from "@shared/schema";

const ADMIN_EMAIL = "globalmarketradar@gmail.com";

export function canAccessReport(
  user: User | null | undefined,
  report: Report,
  subscription: Subscription | null | undefined,
): boolean {
  if (user?.email === ADMIN_EMAIL) return true;
  if (subscription?.status === "active") return true;
  return report.reportType === "free";
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.email === ADMIN_EMAIL;
}

export function isSubscribed(subscription: Subscription | null | undefined): boolean {
  return subscription?.status === "active";
}
