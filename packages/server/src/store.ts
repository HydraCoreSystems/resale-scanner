import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SoldRow, SoldStats } from "@rs/core";

export interface Account {
  id: string;
  appleSub: string;
  createdAt: string;
  /** Lifetime free scans used. */
  freeUsed: number;
  /** Active subscription, or null. */
  subscription: { productId: string; expiresAt: string } | null;
  /** Scans used inside the current monthly allowance window. */
  monthUsed: number;
  /** Start of the current allowance window, ISO. */
  monthStart: string | null;
  /** Bought scans left. */
  packBalance: number;
  /** Apple transaction ids already applied. */
  seenTransactions: string[];
}

export interface ScanRecord {
  id: string;
  accountId: string;
  createdAt: string;
  kind: "photo" | "barcode";
  code?: string;
  candidates: string[];
  confirmedWords?: string;
  stats?: SoldStats;
  listings?: SoldRow[];
  lookbackDays?: number;
  tagPrice?: number;
  call?: string;
  dataSource: "real" | "mock";
  priceCalls: number;
  /** Where the scan was charged from. Null once refunded. */
  spentFrom: "free" | "allowance" | "pack" | null;
}

export interface CacheEntry {
  rows: SoldRow[];
  fetchedAt: number;
  vendor: string;
}

export interface Store {
  getAccount(id: string): Account | undefined;
  getAccountByApple(sub: string): Account | undefined;
  putAccount(a: Account): void;
  getScan(id: string): ScanRecord | undefined;
  putScan(s: ScanRecord): void;
  deleteScan(id: string): void;
  listScans(accountId: string, limit: number): ScanRecord[];
  getCache(key: string): CacheEntry | undefined;
  putCache(key: string, e: CacheEntry): void;
}

interface Snapshot {
  accounts: Account[];
  scans: ScanRecord[];
  cache: Record<string, CacheEntry>;
}

/** In memory store with optional JSON file persistence. A real database can replace it behind the same interface. */
export class FileStore implements Store {
  private accounts = new Map<string, Account>();
  private scans = new Map<string, ScanRecord>();
  private cache = new Map<string, CacheEntry>();

  constructor(private path?: string) {
    if (path && existsSync(path)) {
      const snap = JSON.parse(readFileSync(path, "utf8")) as Snapshot;
      snap.accounts.forEach((a) => this.accounts.set(a.id, a));
      snap.scans.forEach((s) => this.scans.set(s.id, s));
      Object.entries(snap.cache ?? {}).forEach(([k, v]) => this.cache.set(k, v));
    }
  }

  private save(): void {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const snap: Snapshot = {
      accounts: [...this.accounts.values()],
      scans: [...this.scans.values()],
      cache: Object.fromEntries(this.cache),
    };
    writeFileSync(this.path, JSON.stringify(snap));
  }

  getAccount(id: string) {
    return this.accounts.get(id);
  }
  getAccountByApple(sub: string) {
    return [...this.accounts.values()].find((a) => a.appleSub === sub);
  }
  putAccount(a: Account) {
    this.accounts.set(a.id, a);
    this.save();
  }
  getScan(id: string) {
    return this.scans.get(id);
  }
  putScan(s: ScanRecord) {
    this.scans.set(s.id, s);
    this.save();
  }
  deleteScan(id: string) {
    this.scans.delete(id);
    this.save();
  }
  listScans(accountId: string, limit: number) {
    return [...this.scans.values()]
      .filter((s) => s.accountId === accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
  getCache(key: string) {
    return this.cache.get(key);
  }
  putCache(key: string, e: CacheEntry) {
    this.cache.set(key, e);
    this.save();
  }
}
