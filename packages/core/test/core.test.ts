import { describe, expect, it } from "vitest";
import { cleanRows, computeStats, computeVerdict, median, percentile, DEFAULT_SETTINGS } from "../src";
import type { SoldRow, SoldStats } from "../src";

const row = (title: string, price: number, soldDate = "2026-10-20", extra: Partial<SoldRow> = {}): SoldRow => ({
  title,
  price,
  soldDate,
  ...extra,
});

describe("stats", () => {
  it("median of odd and even sets", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
  it("percentiles interpolate", () => {
    expect(percentile([10, 20, 30, 40, 50], 0.25)).toBe(20);
    expect(percentile([10, 20, 30, 40, 50], 0.75)).toBe(40);
  });
  it("computeStats gives count, median, range, latest date", () => {
    const s = computeStats([row("a", 10, "2026-09-01"), row("a", 20, "2026-10-05"), row("a", 30, "2026-08-01")]);
    expect(s.count).toBe(3);
    expect(s.median).toBe(20);
    expect(s.low).toBe(15);
    expect(s.high).toBe(25);
    expect(s.mostRecentSale).toBe("2026-10-05");
  });
  it("flags a wide spread", () => {
    expect(computeStats([row("a", 5), row("a", 10), row("a", 40), row("a", 60), row("a", 80)]).wideSpread).toBe(true);
    expect(computeStats([row("a", 20), row("a", 21), row("a", 22), row("a", 23), row("a", 24)]).wideSpread).toBe(false);
  });
  it("handles no rows", () => {
    const s = computeStats([]);
    expect(s.count).toBe(0);
    expect(s.median).toBeNull();
  });
});

describe("cleanRows", () => {
  const q = "Nintendo Switch Lite Turquoise";
  it("keeps matching rows and drops parts sales", () => {
    const rows = [
      row("Nintendo Switch Lite Turquoise Console", 120),
      row("Nintendo Switch Lite Turquoise for parts not working", 40),
      row("Nintendo Switch Lite Turquoise case only", 8),
      row("Sony PlayStation 5 Console", 400),
    ];
    const out = cleanRows(rows, { query: q });
    expect(out.rows.map((r) => r.price)).toEqual([120]);
    expect(out.dropped.length).toBe(3);
  });
  it("requires model numbers to appear", () => {
    const out = cleanRows([row("Makita XPH12 drill", 80), row("Makita XPH10 drill", 60)], { query: "Makita XPH12 drill" });
    expect(out.rows.length).toBe(1);
    expect(out.rows[0]?.price).toBe(80);
  });
  it("drops bad prices and duplicates", () => {
    const out = cleanRows([row("Pyrex bowl set", 0), row("Pyrex bowl set", 20), row("Pyrex bowl set", 20)], {
      query: "Pyrex bowl set",
    });
    expect(out.rows.length).toBe(1);
  });
  it("keeps a parts row when the shopper asked for parts", () => {
    const out = cleanRows([row("Zelda case only", 5)], { query: "Zelda case only" });
    expect(out.rows.length).toBe(1);
  });
});

describe("verdict", () => {
  const stats = (median: number, count = 10): SoldStats => ({
    count,
    median,
    low: median * 0.9,
    high: median * 1.1,
    mostRecentSale: "2026-10-30",
    wideSpread: false,
  });

  it("says not enough sales under 5", () => {
    const v = computeVerdict(stats(50, 4), 5);
    expect(v.call).toBe("not_enough_sales");
    expect(v.expectedKeep).toBeNull();
  });
  it("does the fee and shipping math", () => {
    // 50 - 6.80 fee - 0.40 fixed - 7.00 shipping = 35.80
    const v = computeVerdict(stats(50), 10);
    expect(v.feeAmount).toBe(6.8);
    expect(v.fixedFee).toBe(0.4);
    expect(v.expectedKeep).toBe(35.8);
    expect(v.expectedProfit).toBe(25.8);
  });
  it("buys when profit >= 10 and return >= 40 percent", () => {
    expect(computeVerdict(stats(50), 10).call).toBe("buy");
  });
  it("close call when profitable but under the margin", () => {
    // keep 35.80; tag 30 -> profit 5.80
    expect(computeVerdict(stats(50), 30).call).toBe("close_call");
    // high profit but low return: keep 135.8-ish
    const v = computeVerdict(stats(150), 110); // keep = 150-20.4-0.4-7 = 122.2, profit 12.2, return 11%
    expect(v.call).toBe("close_call");
  });
  it("passes when keep is at or under the tag", () => {
    expect(computeVerdict(stats(50), 35.8).call).toBe("pass");
    expect(computeVerdict(stats(50), 40).call).toBe("pass");
  });
  it("uses the small order fee at 10 dollars or less", () => {
    expect(computeVerdict(stats(10), 1).fixedFee).toBe(0.3);
  });
  it("respects shopper settings", () => {
    const v = computeVerdict(stats(50), 30, { ...DEFAULT_SETTINGS, minProfit: 5, minReturnPercent: 10 });
    expect(v.call).toBe("buy");
  });
});
