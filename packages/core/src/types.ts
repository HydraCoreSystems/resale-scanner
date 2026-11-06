export interface SoldRow {
  title: string;
  /** Price the item sold for, in dollars. For Best Offer sales this is the accepted price when the vendor gives it. */
  price: number;
  /** Shipping the buyer paid, in dollars, when known. Not used in the median. */
  shipping?: number;
  /** ISO date string, YYYY-MM-DD or full ISO. */
  soldDate: string;
  condition?: string;
  url?: string;
}

export interface SoldStats {
  count: number;
  median: number | null;
  /** 25th percentile. Start of the middle range. */
  low: number | null;
  /** 75th percentile. End of the middle range. */
  high: number | null;
  mostRecentSale: string | null;
  /** True when the middle range is wide enough that condition probably explains it. */
  wideSpread: boolean;
}

export interface VerdictSettings {
  /** Selling fee as a percent of the sale price. Shopper can change it. */
  feePercent: number;
  /** Fixed per order fee in dollars. Leave undefined to use eBay's tiered fee ($0.30 up to $10, else $0.40). */
  fixedFee?: number;
  /** Flat shipping cost estimate in dollars. */
  shipping: number;
  /** Buy needs at least this many dollars of expected profit. */
  minProfit: number;
  /** Buy needs at least this percent return over cost. */
  minReturnPercent: number;
  /** Below this many sales the app shows Not enough sales. */
  minSales: number;
}

export type VerdictCall = "buy" | "close_call" | "pass" | "not_enough_sales";

export interface Verdict {
  call: VerdictCall;
  /** Plain numbers shown on screen. Null when there was no call. */
  medianSold: number | null;
  feeAmount: number | null;
  fixedFee: number | null;
  shipping: number | null;
  expectedKeep: number | null;
  tagPrice: number;
  expectedProfit: number | null;
  returnPercent: number | null;
  /** One plain sentence for the screen. */
  explanation: string;
}
