import { PACK_SIZE } from "./quota";

export const PRODUCT_MONTHLY = "scanner.monthly";
export const PRODUCT_ANNUAL = "scanner.annual";
export const PRODUCT_PACK = "scanner.pack25";

export interface VerifiedTransaction {
  transactionId: string;
  productId: string;
  /** ISO. Present for subscriptions. */
  expiresAt?: string;
}

export interface PurchaseVerifier {
  readonly dataSource: "real" | "mock";
  verify(signedTransaction: string): Promise<VerifiedTransaction>;
}

/**
 * Development only. Accepts "mock:<productId>:<transactionId>" so purchase flows can be built and
 * tested before the app exists in App Store Connect.
 */
export class MockPurchaseVerifier implements PurchaseVerifier {
  readonly dataSource = "mock" as const;
  async verify(signed: string): Promise<VerifiedTransaction> {
    const [tag, productId, transactionId] = signed.split(":");
    if (tag !== "mock" || !productId || !transactionId) throw new Error("not a mock transaction");
    if (productId === PRODUCT_PACK) return { transactionId, productId };
    if (productId === PRODUCT_MONTHLY || productId === PRODUCT_ANNUAL) {
      const days = productId === PRODUCT_ANNUAL ? 365 : 30;
      return { transactionId, productId, expiresAt: new Date(Date.now() + days * 86400000).toISOString() };
    }
    throw new Error("unknown product");
  }
}

/**
 * Placeholder for the real App Store check. It refuses everything rather than trust an unchecked receipt.
 * Real verification needs Apple's signed transaction chain check (App Store Server Library) and the app's
 * App Store Connect setup, which does not exist yet. Listed in docs/OPEN_QUESTIONS.md.
 */
export class UnconfiguredPurchaseVerifier implements PurchaseVerifier {
  readonly dataSource = "real" as const;
  async verify(): Promise<VerifiedTransaction> {
    throw new Error("Apple purchase verification is not configured on this server");
  }
}

export function packScans(productId: string): number {
  return productId === PRODUCT_PACK ? PACK_SIZE : 0;
}
