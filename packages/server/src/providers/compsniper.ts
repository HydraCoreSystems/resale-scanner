import type { SoldRow } from "@rs/core";
import { VendorError, type SoldProvider, type SoldQuery } from "./types";

/**
 * CompSniper sold listings.
 * From CompSniper docs read 2026-11-06:
 *  - GET https://api.compsniper.com/v1/scrape, about 90 days. GET /v1/research/sold reaches up to 3 years.
 *  - Auth: Authorization: Bearer <key>.
 *  - Params: keyword (required), page, count (1..240), sold, soldAfter, soldBefore, itemCondition,
 *    exactMatch, relevance, bestOfferPrice.
 *  - Items: title, url, condition, soldPrice, shippingPrice, endedAt, bestOfferAccepted, acceptedOfferPrice
 *    (acceptedOfferPrice present when bestOfferPrice=true).
 * UNVERIFIED: that /v1/research/sold takes the same parameters, and the exact types of the price fields
 * (this code accepts numbers or strings like "$12.50"). Our server computes its own median and range,
 * so the vendor summary is not used. relevance=false asks for raw rows so our cleaning is the only filter.
 */
export class CompSniper implements SoldProvider {
  readonly id = "compsniper";
  readonly dataSource = "real" as const;
  constructor(
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async fetchSold(q: SoldQuery): Promise<SoldRow[]> {
    const path = q.lookbackDays > 90 ? "/v1/research/sold" : "/v1/scrape";
    const after = new Date(Date.now() - q.lookbackDays * 86400000).toISOString().slice(0, 10);
    const params = new URLSearchParams({
      keyword: q.keyword,
      sold: "true",
      count: "240",
      soldAfter: after,
      bestOfferPrice: "true",
      relevance: "false",
    });
    const res = await this.fetchImpl(`https://api.compsniper.com${path}?${params}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) throw new VendorError("compsniper", "key rejected", res.status);
    if (res.status === 429) throw new VendorError("compsniper", "monthly requests used up", 429);
    if (!res.ok) throw new VendorError("compsniper", `request failed (${res.status})`, res.status);
    const json = (await res.json()) as { items?: Record<string, unknown>[] };
    const rows: SoldRow[] = [];
    for (const it of json.items ?? []) {
      const price = toNumber(it["acceptedOfferPrice"]) ?? toNumber(it["soldPrice"]);
      const title = typeof it["title"] === "string" ? it["title"] : "";
      const ended = typeof it["endedAt"] === "string" ? it["endedAt"] : "";
      if (price === null || !title || !ended) continue;
      rows.push({
        title,
        price,
        shipping: toNumber(it["shippingPrice"]) ?? undefined,
        soldDate: ended.slice(0, 10),
        condition: typeof it["condition"] === "string" ? it["condition"] : undefined,
        url: typeof it["url"] === "string" ? it["url"] : undefined,
      });
    }
    return rows;
  }
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && v.trim() !== "" ? n : null;
  }
  return null;
}
