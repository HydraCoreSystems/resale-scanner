import { PRODUCT_ANNUAL, PRODUCT_MONTHLY, PRODUCT_PACK } from "./products";

export interface StoreProduct {
  id: string;
  title: string;
  /** Text shown for the price. From the store once StoreKit is wired, from the spec until then. */
  priceText: string;
  detail: string;
}

/** What the app needs from Apple's purchase system. Anything that talks to StoreKit sits behind this. */
export interface PurchaseClient {
  readonly kind: "mock" | "storekit";
  products(): Promise<StoreProduct[]>;
  /** Returns the signed transaction the server verifies. */
  buy(productId: string): Promise<string>;
  /** Returns signed transactions for everything the Apple ID already owns. */
  restore(): Promise<string[]>;
}

// Prices below come from the spec pricing model. The real client must replace them with the store's own text.
const SPEC_PRODUCTS: StoreProduct[] = [
  { id: PRODUCT_MONTHLY, title: "Monthly", priceText: "$9.99 per month", detail: "100 scans each month. Renews until cancelled." },
  { id: PRODUCT_ANNUAL, title: "Yearly", priceText: "$79.99 per year", detail: "100 scans each month. Renews until cancelled." },
  { id: PRODUCT_PACK, title: "25 scan pack", priceText: "$2.99", detail: "25 more scans. One time purchase." },
];

class MockPurchaseClient implements PurchaseClient {
  readonly kind = "mock" as const;
  async products() {
    return SPEC_PRODUCTS;
  }
  async buy(productId: string) {
    return `mock:${productId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  async restore() {
    return [];
  }
}

/**
 * Not wired yet. Needs the in app products created in App Store Connect and a StoreKit 2 library choice
 * confirmed against the SDK in use. Fails loudly so nothing pretends to be paid.
 */
class UnwiredStoreKitClient implements PurchaseClient {
  readonly kind = "storekit" as const;
  async products() {
    return SPEC_PRODUCTS;
  }
  async buy(): Promise<string> {
    throw new Error("Purchases are not switched on in this build yet.");
  }
  async restore(): Promise<string[]> {
    throw new Error("Restore is not switched on in this build yet.");
  }
}

export const purchases: PurchaseClient = process.env.EXPO_PUBLIC_MOCK_PURCHASES === "1" ? new MockPurchaseClient() : new UnwiredStoreKitClient();
