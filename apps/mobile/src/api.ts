import Constants from "expo-constants";
import type { SoldRow, SoldStats } from "@rs/core";

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };
export const API_URL = process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || "http://localhost:8787";

export interface Entitlement {
  plan: "free" | "paid";
  freeRemaining: number;
  allowanceRemaining: number;
  packBalance: number;
  totalRemaining: number;
  renewsOrExpires: string | null;
}

export type DataSource = "real" | "mock";

export interface NameResult {
  scanId: string;
  candidates: string[];
  nothingSolid?: boolean;
  dataSource: DataSource;
  entitlement: Entitlement;
}

export type BarcodeResult =
  | ({ found: true } & NameResult)
  | { found: false; message: string; entitlement: Entitlement };

export interface PriceResult {
  scanId: string;
  words: string;
  stats: SoldStats;
  listings: SoldRow[];
  lookbackDays: number;
  thin: boolean;
  cached: boolean;
  dataSource: DataSource;
}

export interface ScanSummary {
  id: string;
  createdAt: string;
  kind: "photo" | "barcode";
  name: string;
  median: number | null;
  count: number | null;
  tagPrice: number | null;
  call: string | null;
  dataSource: DataSource;
}

export interface ScanDetail extends ScanSummary {
  candidates: string[];
  stats: SoldStats | null;
  listings: SoldRow[];
  lookbackDays: number | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let sessionToken: string | null = null;
let onSignedOut: (() => void) | null = null;
export const setToken = (t: string | null) => {
  sessionToken = t;
};
export const setSignedOutHandler = (fn: () => void) => {
  onSignedOut = fn;
};

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: {
        "content-type": "application/json",
        ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("No signal to the scan service. Check your connection and try again.", 0);
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401 && path !== "/v1/auth/apple") onSignedOut?.();
  if (!res.ok) throw new ApiError(json.error ?? "Something went wrong. Try again.", res.status);
  return json as T;
}

export const api = {
  signIn: (identityToken: string) =>
    request<{ token: string; entitlement: Entitlement; dataSources: Record<string, DataSource> }>("/v1/auth/apple", {
      body: { identityToken },
    }),
  me: () => request<{ accountId: string; entitlement: Entitlement; dataSources: Record<string, DataSource> }>("/v1/me"),
  scanPhoto: (imageBase64: string, mime: "image/jpeg") => request<NameResult>("/v1/scans/photo", { body: { imageBase64, mime } }),
  scanBarcode: (code: string) => request<BarcodeResult>("/v1/scans/barcode", { body: { code } }),
  scanText: (words: string) => request<NameResult>("/v1/scans/text", { body: { words } }),
  price: (scanId: string, words: string, wholeItem = true) =>
    request<PriceResult>(`/v1/scans/${scanId}/price`, { body: { words, wholeItem } }),
  history: () => request<{ scans: ScanSummary[] }>("/v1/scans?limit=100"),
  scan: (id: string) => request<ScanDetail>(`/v1/scans/${id}`),
  saveCall: (id: string, tagPrice: number, call: string) =>
    request<ScanSummary>(`/v1/scans/${id}`, { method: "PATCH", body: { tagPrice, call } }),
  remove: (id: string) => request<{ ok: true }>(`/v1/scans/${id}`, { method: "DELETE" }),
  purchase: (signedTransaction: string) => request<{ entitlement: Entitlement }>("/v1/purchases", { body: { signedTransaction } }),
};
