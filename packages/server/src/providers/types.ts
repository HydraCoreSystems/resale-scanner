import type { SoldRow } from "@rs/core";

/** "real" means a live vendor answered. "mock" means built in sample data. Every API response carries this. */
export type DataSource = "real" | "mock";

export interface NameMatch {
  title: string;
  link?: string;
  source?: string;
  price?: string;
}

export interface NamingProvider {
  readonly id: string;
  readonly dataSource: DataSource;
  /** Returns raw visual matches for one photo. Photo bytes are never stored. */
  matchImage(image: Uint8Array, mime: string): Promise<NameMatch[]>;
}

export interface BarcodeProduct {
  title: string;
  brand?: string;
  model?: string;
}

export interface BarcodeProvider {
  readonly id: string;
  readonly dataSource: DataSource;
  /** Returns null when the code is not in the database. */
  lookup(code: string): Promise<BarcodeProduct | null>;
}

export interface SoldQuery {
  keyword: string;
  lookbackDays: number;
}

export interface SoldProvider {
  readonly id: string;
  readonly dataSource: DataSource;
  fetchSold(q: SoldQuery): Promise<SoldRow[]>;
}

export class VendorError extends Error {
  constructor(
    public vendor: string,
    message: string,
    public status?: number,
  ) {
    super(`${vendor}: ${message}`);
  }
}
