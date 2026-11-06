import type { Account } from "./store";

/** From the spec pricing model. */
export const FREE_SCANS = 5;
export const MONTHLY_ALLOWANCE = 100;
export const PACK_SIZE = 25;

export type SpendFrom = "free" | "allowance" | "pack";

export interface Entitlement {
  plan: "free" | "paid";
  freeRemaining: number;
  allowanceRemaining: number;
  packBalance: number;
  totalRemaining: number;
  renewsOrExpires: string | null;
}

function subscriptionActive(a: Account, now: Date): boolean {
  return !!a.subscription && new Date(a.subscription.expiresAt).getTime() > now.getTime();
}

/** Allowance window is 30 days from the first scan after a subscription starts or the last window ended. */
function rollWindow(a: Account, now: Date): void {
  if (!subscriptionActive(a, now)) return;
  const start = a.monthStart ? new Date(a.monthStart).getTime() : 0;
  if (!a.monthStart || now.getTime() - start >= 30 * 86400000) {
    a.monthStart = now.toISOString();
    a.monthUsed = 0;
  }
}

export function entitlement(a: Account, now = new Date()): Entitlement {
  const active = subscriptionActive(a, now);
  const copy = { ...a };
  rollWindow(copy, now);
  const freeRemaining = Math.max(0, FREE_SCANS - a.freeUsed);
  const allowanceRemaining = active ? Math.max(0, MONTHLY_ALLOWANCE - copy.monthUsed) : 0;
  return {
    plan: active ? "paid" : "free",
    freeRemaining,
    allowanceRemaining,
    packBalance: a.packBalance,
    totalRemaining: freeRemaining + allowanceRemaining + a.packBalance,
    renewsOrExpires: active ? (a.subscription?.expiresAt ?? null) : null,
  };
}

/** Takes one scan from the account. Order: free scans, then the monthly allowance, then bought packs. Returns null when none left. */
export function spendScan(a: Account, now = new Date()): SpendFrom | null {
  rollWindow(a, now);
  if (a.freeUsed < FREE_SCANS) {
    a.freeUsed += 1;
    return "free";
  }
  if (subscriptionActive(a, now) && a.monthUsed < MONTHLY_ALLOWANCE) {
    a.monthUsed += 1;
    return "allowance";
  }
  if (a.packBalance > 0) {
    a.packBalance -= 1;
    return "pack";
  }
  return null;
}

export function refundScan(a: Account, from: SpendFrom): void {
  if (from === "free") a.freeUsed = Math.max(0, a.freeUsed - 1);
  else if (from === "allowance") a.monthUsed = Math.max(0, a.monthUsed - 1);
  else a.packBalance += 1;
}
