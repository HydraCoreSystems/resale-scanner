import { randomBytes } from "node:crypto";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { AppleIdentityVerifier, DevIdentityVerifier, Sessions } from "./auth";
import { CompSniper } from "./providers/compsniper";
import { MockBarcode, MockNaming, MockSold } from "./providers/mock";
import { SerpApiLens } from "./providers/serpapi";
import { UpcItemDb } from "./providers/upcitemdb";
import { FileStore } from "./store";
import { MockPurchaseVerifier, UnconfiguredPurchaseVerifier } from "./subscriptions";

const env = process.env;
const log = (m: string) => console.log(`[server] ${m}`);

// The free UPCitemdb tier needs no key, so barcode lookups are always real unless USE_MOCK_BARCODE=1.
const naming = env.SERPAPI_KEY ? new SerpApiLens(env.SERPAPI_KEY) : new MockNaming();
const barcode = env.USE_MOCK_BARCODE === "1" ? new MockBarcode() : new UpcItemDb(env.UPCITEMDB_USER_KEY);
const sold = env.COMPSNIPER_KEY ? new CompSniper(env.COMPSNIPER_KEY) : new MockSold();
const identity = env.APPLE_BUNDLE_ID ? new AppleIdentityVerifier(env.APPLE_BUNDLE_ID) : new DevIdentityVerifier();
const purchases = env.APPLE_BUNDLE_ID ? new UnconfiguredPurchaseVerifier() : new MockPurchaseVerifier();

const secret = env.SESSION_SECRET || randomBytes(32).toString("hex");
if (!env.SESSION_SECRET) log("SESSION_SECRET not set: using a random one, sessions end when the server restarts.");

log(`naming: ${naming.id} (${naming.dataSource})`);
log(`barcode: ${barcode.id} (${barcode.dataSource})`);
log(`sold data: ${sold.id} (${sold.dataSource})`);
if (!env.APPLE_BUNDLE_ID) log("APPLE_BUNDLE_ID not set: dev sign in and mock purchases are ON. Never run this way in production.");

const app = createApp({
  store: new FileStore(env.DATA_FILE),
  naming,
  barcode,
  sold,
  identity,
  sessions: new Sessions(secret),
  purchases,
});

const port = Number(env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => log(`listening on ${port}`));
