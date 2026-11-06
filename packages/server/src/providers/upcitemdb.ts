import { VendorError, type BarcodeProduct, type BarcodeProvider } from "./types";

/**
 * UPCitemdb lookup.
 * From UPCitemdb's API page: free path /prod/trial, paid path /prod/v1, paid key sent as header user_key,
 * and key_type header. UNVERIFIED because the docs pages fetched did not show them:
 * the host (api.upcitemdb.com), the query parameter name (upc), and the response fields
 * (items[].title, brand, model). Confirm on the first free tier call.
 */
export class UpcItemDb implements BarcodeProvider {
  readonly id = "upcitemdb";
  readonly dataSource = "real" as const;
  constructor(
    private userKey: string | undefined,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async lookup(code: string): Promise<BarcodeProduct | null> {
    const clean = code.replace(/\D/g, "");
    if (clean.length < 8) return null;
    const path = this.userKey ? "/prod/v1/lookup" : "/prod/trial/lookup";
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.userKey) {
      headers["user_key"] = this.userKey;
      headers["key_type"] = "3scale";
    }
    const res = await this.fetchImpl(`https://api.upcitemdb.com${path}?upc=${clean}`, { headers });
    if (res.status === 404) return null;
    if (res.status === 429) throw new VendorError("upcitemdb", "daily limit reached", 429);
    if (!res.ok) throw new VendorError("upcitemdb", `lookup failed (${res.status})`, res.status);
    const json = (await res.json()) as { items?: { title?: string; brand?: string; model?: string }[] };
    const item = json.items?.[0];
    if (!item?.title) return null;
    return { title: item.title, brand: item.brand || undefined, model: item.model || undefined };
  }
}
