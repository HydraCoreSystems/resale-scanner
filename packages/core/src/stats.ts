import type { SoldRow, SoldStats } from "./types";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Linear interpolation percentile on a sorted copy. p in 0..1. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0] ?? null;
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (b - a) * (pos - lo);
}

export function median(values: number[]): number | null {
  return percentile(values, 0.5);
}

/** A middle range wider than this share of the median suggests condition is moving the price. */
export const WIDE_SPREAD_RATIO = 0.6;

export function computeStats(rows: SoldRow[]): SoldStats {
  const prices = rows.map((r) => r.price);
  const med = median(prices);
  const low = percentile(prices, 0.25);
  const high = percentile(prices, 0.75);
  const dates = rows
    .map((r) => r.soldDate)
    .filter(Boolean)
    .sort();
  const wide =
    med !== null && low !== null && high !== null && med > 0
      ? (high - low) / med > WIDE_SPREAD_RATIO
      : false;
  return {
    count: rows.length,
    median: med === null ? null : round2(med),
    low: low === null ? null : round2(low),
    high: high === null ? null : round2(high),
    mostRecentSale: dates.length ? (dates[dates.length - 1] as string) : null,
    wideSpread: wide,
  };
}
