import { randomUUID } from "node:crypto";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { cleanRows, computeStats, type SoldRow } from "@rs/core";
import type { IdentityVerifier, Sessions } from "./auth";
import { pickCandidates } from "./naming";
import type { BarcodeProvider, NamingProvider, SoldProvider } from "./providers/types";
import { VendorError } from "./providers/types";
import { entitlement, refundScan, spendScan } from "./quota";
import { packScans, type PurchaseVerifier } from "./subscriptions";
import type { Account, ScanRecord, Store } from "./store";

export interface Deps {
  store: Store;
  naming: NamingProvider;
  barcode: BarcodeProvider;
  sold: SoldProvider;
  identity: IdentityVerifier;
  sessions: Sessions;
  purchases: PurchaseVerifier;
  now?: () => Date;
  cacheTtlMs?: number;
}

const MAX_IMAGE_BYTES = 500 * 1024;
const MAX_PRICE_CALLS = 4;
const MIN_SALES = 5;
const LOOKBACKS = [90, 365] as const;

type Env = { Variables: { account: Account } };

const err = (c: Context, status: 400 | 401 | 402 | 404 | 413 | 429 | 502, message: string) => c.json({ error: message }, status);

export function createApp(deps: Deps) {
  const app = new Hono<Env>();
  const now = deps.now ?? (() => new Date());
  const ttl = deps.cacheTtlMs ?? 24 * 3600 * 1000;

  const sources = () => ({
    naming: deps.naming.dataSource,
    barcode: deps.barcode.dataSource,
    sold: deps.sold.dataSource,
    purchases: deps.purchases.dataSource,
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/v1/auth/apple", async (c) => {
    const body = z.object({ identityToken: z.string().min(5) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return err(c, 400, "Missing identity token.");
    let sub: string;
    try {
      sub = (await deps.identity.verify(body.data.identityToken)).sub;
    } catch {
      return err(c, 401, "Sign in with Apple could not be verified.");
    }
    let account = deps.store.getAccountByApple(sub);
    if (!account) {
      account = {
        id: randomUUID(),
        appleSub: sub,
        createdAt: now().toISOString(),
        freeUsed: 0,
        subscription: null,
        monthUsed: 0,
        monthStart: null,
        packBalance: 0,
        seenTransactions: [],
      };
      deps.store.putAccount(account);
    }
    return c.json({ token: await deps.sessions.issue(account.id), entitlement: entitlement(account, now()), dataSources: sources() });
  });

  app.use("/v1/*", async (c, next) => {
    if (c.req.path === "/v1/auth/apple") return next();
    const h = c.req.header("Authorization") ?? "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    const id = token ? await deps.sessions.check(token) : null;
    const account = id ? deps.store.getAccount(id) : undefined;
    if (!account) return err(c, 401, "Please sign in again.");
    c.set("account", account);
    return next();
  });

  app.get("/v1/me", (c) => {
    const a = c.get("account");
    return c.json({ accountId: a.id, entitlement: entitlement(a, now()), dataSources: sources() });
  });

  // ---- scans: start ----

  const outOfScans = (c: Context) =>
    err(c, 402, "You are out of scans. Pick up a scan pack or subscribe to keep scanning.");

  app.post("/v1/scans/photo", async (c) => {
    const account = c.get("account");
    const body = z
      .object({ imageBase64: z.string().min(100), mime: z.enum(["image/jpeg", "image/png", "image/webp"]) })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return err(c, 400, "Send one JPG, PNG or WebP photo.");
    const bytes = Buffer.from(body.data.imageBase64, "base64");
    if (bytes.byteLength > MAX_IMAGE_BYTES) return err(c, 413, "Photo is over 500 KB. Shrink it and try again.");

    const spent = spendScan(account, now());
    if (!spent) return outOfScans(c);
    deps.store.putAccount(account);

    let matches;
    try {
      matches = await deps.naming.matchImage(new Uint8Array(bytes), body.data.mime);
    } catch (e) {
      refundScan(account, spent);
      deps.store.putAccount(account);
      return err(c, 502, e instanceof VendorError ? "The photo match service did not answer. You were not charged." : "Could not read that photo. You were not charged.");
    }
    const cand = pickCandidates(matches);
    const scan: ScanRecord = {
      id: randomUUID(),
      accountId: account.id,
      createdAt: now().toISOString(),
      kind: "photo",
      candidates: cand.names,
      dataSource: deps.naming.dataSource,
      priceCalls: 0,
      spentFrom: spent,
    };
    deps.store.putScan(scan);
    return c.json({
      scanId: scan.id,
      candidates: cand.names,
      nothingSolid: cand.nothingSolid,
      dataSource: scan.dataSource,
      entitlement: entitlement(account, now()),
    });
  });

  app.post("/v1/scans/barcode", async (c) => {
    const account = c.get("account");
    const body = z.object({ code: z.string().regex(/^\d{8,14}$/) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return err(c, 400, "That does not look like a barcode number.");

    const spent = spendScan(account, now());
    if (!spent) return outOfScans(c);

    let product;
    try {
      product = await deps.barcode.lookup(body.data.code);
    } catch {
      refundScan(account, spent);
      deps.store.putAccount(account);
      return err(c, 502, "The barcode lookup did not answer. You were not charged.");
    }
    if (!product) {
      refundScan(account, spent);
      deps.store.putAccount(account);
      return c.json({
        found: false,
        message: "That barcode is not in the database. Take a photo or type the item's words. You were not charged.",
        entitlement: entitlement(account, now()),
      });
    }
    deps.store.putAccount(account);
    const names = [product.title];
    const alt = [product.brand, product.model].filter(Boolean).join(" ");
    if (alt && !product.title.toLowerCase().includes(alt.toLowerCase())) names.push(alt);
    const scan: ScanRecord = {
      id: randomUUID(),
      accountId: account.id,
      createdAt: now().toISOString(),
      kind: "barcode",
      code: body.data.code,
      candidates: names,
      dataSource: deps.barcode.dataSource,
      priceCalls: 0,
      spentFrom: spent,
    };
    deps.store.putScan(scan);
    return c.json({ found: true, scanId: scan.id, candidates: names, dataSource: scan.dataSource, entitlement: entitlement(account, now()) });
  });

  /** Typed words with no photo or code. Costs one scan like any other. */
  app.post("/v1/scans/text", async (c) => {
    const account = c.get("account");
    const body = z.object({ words: z.string().trim().min(3).max(120) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return err(c, 400, "Type at least a few words for the item.");
    const spent = spendScan(account, now());
    if (!spent) return outOfScans(c);
    deps.store.putAccount(account);
    const scan: ScanRecord = {
      id: randomUUID(),
      accountId: account.id,
      createdAt: now().toISOString(),
      kind: "photo",
      candidates: [body.data.words],
      dataSource: deps.sold.dataSource,
      priceCalls: 0,
      spentFrom: spent,
    };
    deps.store.putScan(scan);
    return c.json({ scanId: scan.id, candidates: scan.candidates, dataSource: scan.dataSource, entitlement: entitlement(account, now()) });
  });

  // ---- scans: price ----

  async function soldRows(keyword: string, days: number): Promise<{ rows: SoldRow[]; cached: boolean }> {
    const key = `${deps.sold.id}|${days}|${keyword.toLowerCase().replace(/\s+/g, " ").trim()}`;
    const hit = deps.store.getCache(key);
    if (hit && now().getTime() - hit.fetchedAt < ttl) return { rows: hit.rows, cached: true };
    const rows = await deps.sold.fetchSold({ keyword, lookbackDays: days });
    deps.store.putCache(key, { rows, fetchedAt: now().getTime(), vendor: deps.sold.id });
    return { rows, cached: false };
  }

  app.post("/v1/scans/:id/price", async (c) => {
    const account = c.get("account");
    const scan = deps.store.getScan(c.req.param("id"));
    if (!scan || scan.accountId !== account.id) return err(c, 404, "Scan not found.");
    const body = z
      .object({ words: z.string().trim().min(3).max(120), wholeItem: z.boolean().optional() })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return err(c, 400, "Confirm or type the item's words first.");
    if (scan.priceCalls >= MAX_PRICE_CALLS) return err(c, 429, "That is enough tries for one scan. Start a new scan.");

    const words = body.data.words;
    let usedDays: number = LOOKBACKS[0];
    let cleaned: SoldRow[] = [];
    let cached = true;
    try {
      for (const days of LOOKBACKS) {
        const got = await soldRows(words, days);
        cached = cached && got.cached;
        const cutoff = new Date(now().getTime() - days * 86400000).toISOString().slice(0, 10);
        const inWindow = got.rows.filter((r) => r.soldDate.slice(0, 10) >= cutoff);
        cleaned = cleanRows(inWindow, { query: words, wholeItem: body.data.wholeItem ?? true }).rows;
        usedDays = days;
        if (cleaned.length >= MIN_SALES) break;
      }
    } catch (e) {
      const msg = e instanceof VendorError && e.status === 429 ? "Sold price data is at its limit right now. Try again later." : "The sold price service did not answer. Try again.";
      return err(c, 502, msg);
    }

    cleaned.sort((a, b) => b.soldDate.localeCompare(a.soldDate));
    const stats = computeStats(cleaned);
    scan.confirmedWords = words;
    scan.stats = stats;
    scan.listings = cleaned.slice(0, 100);
    scan.lookbackDays = usedDays;
    scan.priceCalls += 1;
    if (deps.sold.dataSource === "mock") scan.dataSource = "mock";
    deps.store.putScan(scan);

    return c.json({
      scanId: scan.id,
      words,
      stats,
      listings: scan.listings,
      lookbackDays: usedDays,
      thin: stats.count < MIN_SALES,
      cached,
      dataSource: deps.sold.dataSource,
    });
  });

  // ---- history ----

  const summary = (s: ScanRecord) => ({
    id: s.id,
    createdAt: s.createdAt,
    kind: s.kind,
    name: s.confirmedWords ?? s.candidates[0] ?? "Unnamed scan",
    median: s.stats?.median ?? null,
    count: s.stats?.count ?? null,
    tagPrice: s.tagPrice ?? null,
    call: s.call ?? null,
    dataSource: s.dataSource,
  });

  app.get("/v1/scans", (c) => {
    const limit = Math.min(200, Number(c.req.query("limit") ?? 50) || 50);
    return c.json({ scans: deps.store.listScans(c.get("account").id, limit).map(summary) });
  });

  app.get("/v1/scans/:id", (c) => {
    const s = deps.store.getScan(c.req.param("id"));
    if (!s || s.accountId !== c.get("account").id) return err(c, 404, "Scan not found.");
    return c.json({ ...summary(s), candidates: s.candidates, stats: s.stats ?? null, listings: s.listings ?? [], lookbackDays: s.lookbackDays ?? null });
  });

  app.patch("/v1/scans/:id", async (c) => {
    const s = deps.store.getScan(c.req.param("id"));
    if (!s || s.accountId !== c.get("account").id) return err(c, 404, "Scan not found.");
    const body = z
      .object({ tagPrice: z.number().min(0).max(100000), call: z.enum(["buy", "close_call", "pass", "not_enough_sales"]) })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return err(c, 400, "Bad tag price or call.");
    s.tagPrice = body.data.tagPrice;
    s.call = body.data.call;
    deps.store.putScan(s);
    return c.json(summary(s));
  });

  app.delete("/v1/scans/:id", (c) => {
    const s = deps.store.getScan(c.req.param("id"));
    if (!s || s.accountId !== c.get("account").id) return err(c, 404, "Scan not found.");
    deps.store.deleteScan(s.id);
    return c.json({ ok: true });
  });

  // ---- purchases (Apple only) ----

  app.post("/v1/purchases", async (c) => {
    const account = c.get("account");
    const body = z.object({ signedTransaction: z.string().min(5) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return err(c, 400, "Missing purchase receipt.");
    let tx;
    try {
      tx = await deps.purchases.verify(body.data.signedTransaction);
    } catch {
      return err(c, 400, "That purchase could not be verified.");
    }
    if (!account.seenTransactions.includes(tx.transactionId)) {
      account.seenTransactions.push(tx.transactionId);
      const scans = packScans(tx.productId);
      if (scans > 0) account.packBalance += scans;
      if (tx.expiresAt) {
        const cur = account.subscription ? new Date(account.subscription.expiresAt).getTime() : 0;
        if (new Date(tx.expiresAt).getTime() > cur) account.subscription = { productId: tx.productId, expiresAt: tx.expiresAt };
      }
      deps.store.putAccount(account);
    }
    return c.json({ entitlement: entitlement(account, now()) });
  });

  return app;
}
