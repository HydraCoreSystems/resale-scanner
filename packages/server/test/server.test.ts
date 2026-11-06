import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { DevIdentityVerifier, Sessions } from "../src/auth";
import { pickCandidates, cleanTitle } from "../src/naming";
import { MockBarcode, MockNaming, MockSold } from "../src/providers/mock";
import { VendorError, type NamingProvider } from "../src/providers/types";
import { FileStore } from "../src/store";
import { MockPurchaseVerifier } from "../src/subscriptions";

function setup(over: { naming?: NamingProvider } = {}) {
  const app = createApp({
    store: new FileStore(),
    naming: over.naming ?? new MockNaming(),
    barcode: new MockBarcode(),
    sold: new MockSold(),
    identity: new DevIdentityVerifier(),
    sessions: new Sessions("test-secret-test-secret-test-secret"),
    purchases: new MockPurchaseVerifier(),
  });
  const call = async (path: string, init: { method?: string; body?: unknown; token?: string } = {}) => {
    const res = await app.request(path, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: { "content-type": "application/json", ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    return { status: res.status, json: (await res.json()) as any };
  };
  const login = async (name = "phil") => (await call("/v1/auth/apple", { body: { identityToken: `dev:${name}` } })).json.token as string;
  return { call, login };
}

const photo = { imageBase64: Buffer.alloc(2000, 7).toString("base64"), mime: "image/jpeg" };

describe("naming", () => {
  it("cleans site suffixes and long titles", () => {
    expect(cleanTitle("Pyrex Bowl Set | eBay")).toBe("Pyrex Bowl Set");
    expect(cleanTitle("x ".repeat(100)).length).toBeLessThanOrEqual(80);
  });
  it("picks a consensus best guess plus alternates", () => {
    const out = pickCandidates([
      { title: "Pyrex Butterprint Mixing Bowl Set" },
      { title: "Pyrex Butterprint Mixing Bowl Set Turquoise" },
      { title: "Vintage Pyrex Butterprint Bowl Set" },
      { title: "Random Lamp" },
    ]);
    expect(out.nothingSolid).toBe(false);
    expect(out.names[0]).toMatch(/Pyrex/);
    expect(out.names.length).toBeLessThanOrEqual(3);
  });
  it("says nothing solid when matches are few or scattered", () => {
    expect(pickCandidates([{ title: "Lamp" }]).nothingSolid).toBe(true);
    expect(pickCandidates([{ title: "Red lamp shade" }, { title: "Ford truck seat" }, { title: "Garden hose reel" }]).nothingSolid).toBe(true);
  });
});

describe("api flow", () => {
  it("rejects calls without a session", async () => {
    const { call } = setup();
    expect((await call("/v1/me")).status).toBe(401);
  });

  it("photo scan, confirm, price, save tag", async () => {
    const { call, login } = setup();
    const token = await login();
    const scan = await call("/v1/scans/photo", { body: photo, token });
    expect(scan.status).toBe(200);
    expect(scan.json.candidates.length).toBeGreaterThan(0);
    expect(scan.json.dataSource).toBe("mock");
    expect(scan.json.entitlement.freeRemaining).toBe(4);

    const price = await call(`/v1/scans/${scan.json.scanId}/price`, { body: { words: scan.json.candidates[0] }, token });
    expect(price.status).toBe(200);
    expect(price.json.stats.count).toBeGreaterThanOrEqual(5);
    expect(price.json.stats.median).toBeGreaterThan(0);
    // mock rows include "for parts" titles; cleaning must drop them
    expect(price.json.listings.every((l: any) => !/for parts/i.test(l.title))).toBe(true);
    expect(price.json.listings.length).toBe(price.json.stats.count);

    const again = await call(`/v1/scans/${scan.json.scanId}/price`, { body: { words: scan.json.candidates[0] }, token });
    expect(again.json.cached).toBe(true);

    const saved = await call(`/v1/scans/${scan.json.scanId}`, { method: "PATCH", body: { tagPrice: 6, call: "buy" }, token });
    expect(saved.json.call).toBe("buy");
    const hist = await call("/v1/scans", { token });
    expect(hist.json.scans).toHaveLength(1);
    expect(hist.json.scans[0].tagPrice).toBe(6);
  });

  it("thin data is reported as thin", async () => {
    const { call, login } = setup();
    const token = await login();
    const scan = await call("/v1/scans/text", { body: { words: "thin rare widget" }, token });
    const price = await call(`/v1/scans/${scan.json.scanId}/price`, { body: { words: "thin rare widget" }, token });
    expect(price.json.thin).toBe(true);
    expect(price.json.stats.count).toBeLessThan(5);
  });

  it("barcode found, and barcode miss is not charged", async () => {
    const { call, login } = setup();
    const token = await login();
    const hit = await call("/v1/scans/barcode", { body: { code: "012345678905" }, token });
    expect(hit.json.found).toBe(true);
    expect(hit.json.entitlement.freeRemaining).toBe(4);
    const miss = await call("/v1/scans/barcode", { body: { code: "012345678900" }, token });
    expect(miss.json.found).toBe(false);
    expect(miss.json.entitlement.freeRemaining).toBe(4);
  });

  it("vendor failure refunds the scan", async () => {
    const broken: NamingProvider = {
      id: "broken",
      dataSource: "real",
      async matchImage() {
        throw new VendorError("serpapi", "down", 500);
      },
    };
    const { call, login } = setup({ naming: broken });
    const token = await login();
    const r = await call("/v1/scans/photo", { body: photo, token });
    expect(r.status).toBe(502);
    expect((await call("/v1/me", { token })).json.entitlement.freeRemaining).toBe(5);
  });

  it("blocks after 5 free scans, then packs and subscription unlock more", async () => {
    const { call, login } = setup();
    const token = await login();
    for (let i = 0; i < 5; i++) expect((await call("/v1/scans/text", { body: { words: `item number ${i}` }, token })).status).toBe(200);
    const blocked = await call("/v1/scans/text", { body: { words: "one more item" }, token });
    expect(blocked.status).toBe(402);

    const pack = await call("/v1/purchases", { body: { signedTransaction: "mock:scanner.pack25:t1" }, token });
    expect(pack.json.entitlement.packBalance).toBe(25);
    // same transaction twice does not double credit
    const dup = await call("/v1/purchases", { body: { signedTransaction: "mock:scanner.pack25:t1" }, token });
    expect(dup.json.entitlement.packBalance).toBe(25);

    const sub = await call("/v1/purchases", { body: { signedTransaction: "mock:scanner.monthly:t2" }, token });
    expect(sub.json.entitlement.plan).toBe("paid");
    expect(sub.json.entitlement.allowanceRemaining).toBe(100);
    // spends allowance before packs
    await call("/v1/scans/text", { body: { words: "after paying item" }, token });
    const me = await call("/v1/me", { token });
    expect(me.json.entitlement.allowanceRemaining).toBe(99);
    expect(me.json.entitlement.packBalance).toBe(25);
  });

  it("keeps accounts separate", async () => {
    const { call, login } = setup();
    const a = await login("a");
    const b = await login("b");
    const scan = await call("/v1/scans/text", { body: { words: "private thing" }, token: a });
    expect((await call(`/v1/scans/${scan.json.scanId}`, { token: b })).status).toBe(404);
  });

  it("rejects oversize photos", async () => {
    const { call, login } = setup();
    const token = await login();
    const big = { imageBase64: Buffer.alloc(600 * 1024, 1).toString("base64"), mime: "image/jpeg" };
    expect((await call("/v1/scans/photo", { body: big, token })).status).toBe(413);
  });

  it("caps price tries per scan", async () => {
    const { call, login } = setup();
    const token = await login();
    const scan = await call("/v1/scans/text", { body: { words: "pyrex bowl set" }, token });
    for (let i = 0; i < 4; i++) expect((await call(`/v1/scans/${scan.json.scanId}/price`, { body: { words: "pyrex bowl set" }, token })).status).toBe(200);
    expect((await call(`/v1/scans/${scan.json.scanId}/price`, { body: { words: "pyrex bowl set" }, token })).status).toBe(429);
  });
});
