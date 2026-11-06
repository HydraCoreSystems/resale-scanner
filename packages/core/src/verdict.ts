import { round2 } from "./stats";
import type { SoldStats, Verdict, VerdictSettings } from "./types";

/** eBay per order fee: $0.30 on orders of $10 or less, $0.40 above. Read from eBay's selling fees page on 2026-11-06. */
export function tieredFixedFee(orderTotal: number): number {
  return orderTotal <= 10 ? 0.3 : 0.4;
}

/**
 * Starting defaults. The verdict thresholds (10 dollars, 40 percent, 5 sales) come from the spec.
 * feePercent 13.6 is eBay's final value fee for most categories, read from eBay's selling fees page
 * on 2026-11-06. Shipping is a flat placeholder estimate, not a sourced fact. All are settings the
 * shopper can change. See docs/OPEN_QUESTIONS.md.
 */
export const DEFAULT_SETTINGS: VerdictSettings = {
  feePercent: 13.6,
  shipping: 7.0,
  minProfit: 10,
  minReturnPercent: 40,
  minSales: 5,
};

export function computeVerdict(
  stats: SoldStats,
  tagPrice: number,
  settings: VerdictSettings = DEFAULT_SETTINGS,
): Verdict {
  const empty = {
    medianSold: null,
    feeAmount: null,
    fixedFee: null,
    shipping: null,
    expectedKeep: null,
    expectedProfit: null,
    returnPercent: null,
    tagPrice,
  };

  if (stats.count < settings.minSales || stats.median === null) {
    return {
      call: "not_enough_sales",
      ...empty,
      explanation: `Only ${stats.count} recorded ${stats.count === 1 ? "sale" : "sales"} found. Not enough to call it.`,
    };
  }

  const fixedFee = settings.fixedFee ?? tieredFixedFee(stats.median);
  const feeAmount = round2((stats.median * settings.feePercent) / 100);
  const keep = round2(stats.median - feeAmount - fixedFee - settings.shipping);
  const profit = round2(keep - tagPrice);
  const ret = tagPrice > 0 ? round2((profit / tagPrice) * 100) : null;

  const base = {
    medianSold: stats.median,
    feeAmount,
    fixedFee,
    shipping: settings.shipping,
    expectedKeep: keep,
    tagPrice,
    expectedProfit: profit,
    returnPercent: ret,
  };

  if (profit <= 0) {
    return {
      call: "pass",
      ...base,
      explanation: `You would keep about $${keep.toFixed(2)} after fees and shipping. The tag is $${tagPrice.toFixed(2)}.`,
    };
  }

  const retOk = ret === null ? true : ret >= settings.minReturnPercent;
  if (profit >= settings.minProfit && retOk) {
    return {
      call: "buy",
      ...base,
      explanation: `You would keep about $${keep.toFixed(2)} after fees and shipping, about $${profit.toFixed(2)} over the tag.`,
    };
  }

  return {
    call: "close_call",
    ...base,
    explanation: `You would keep about $${keep.toFixed(2)}, only $${profit.toFixed(2)} over the tag. Below your margin.`,
  };
}
