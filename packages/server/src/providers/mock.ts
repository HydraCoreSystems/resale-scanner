import type { SoldRow } from "@rs/core";
import type { BarcodeProduct, BarcodeProvider, NameMatch, NamingProvider, SoldProvider, SoldQuery } from "./types";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_ITEMS = [
  "Pyrex Butterprint Mixing Bowl Set Turquoise",
  "Makita XPH12 Cordless Hammer Drill",
  "Nintendo Switch Lite Turquoise Console",
  "Cuisinart DCC-3200 Coffee Maker",
  "Fiesta Ware Medium Teapot Cobalt",
];

export class MockNaming implements NamingProvider {
  readonly id = "mock-naming";
  readonly dataSource = "mock" as const;
  async matchImage(image: Uint8Array): Promise<NameMatch[]> {
    let h = 0;
    for (let i = 0; i < image.length; i += Math.max(1, Math.floor(image.length / 64))) h = (h * 31 + (image[i] ?? 0)) >>> 0;
    const base = SAMPLE_ITEMS[h % SAMPLE_ITEMS.length] as string;
    const alt1 = SAMPLE_ITEMS[(h + 1) % SAMPLE_ITEMS.length] as string;
    return [
      { title: base, source: "mock" },
      { title: `${base} Vintage`, source: "mock" },
      { title: `${base} Set`, source: "mock" },
      { title: base, source: "mock" },
      { title: alt1, source: "mock" },
    ];
  }
}

export class MockBarcode implements BarcodeProvider {
  readonly id = "mock-barcode";
  readonly dataSource = "mock" as const;
  async lookup(code: string): Promise<BarcodeProduct | null> {
    // Codes ending in 0 behave as "not in the database" so the not found path can be exercised.
    if (code.endsWith("0")) return null;
    const title = SAMPLE_ITEMS[hash(code) % SAMPLE_ITEMS.length] as string;
    return { title, brand: title.split(" ")[0] };
  }
}

export class MockSold implements SoldProvider {
  readonly id = "mock-sold";
  readonly dataSource = "mock" as const;
  constructor(private now: () => Date = () => new Date()) {}

  async fetchSold(q: SoldQuery): Promise<SoldRow[]> {
    const r = rng(hash(q.keyword.toLowerCase()));
    const thin = /\bthin\b/i.test(q.keyword);
    const base = 15 + Math.floor(r() * 75);
    const n = thin ? (q.lookbackDays > 90 ? 4 : 3) : 14;
    const rows: SoldRow[] = [];
    for (let i = 0; i < n; i++) {
      const daysAgo = Math.floor(r() * Math.min(q.lookbackDays, thin ? 300 : 88));
      const d = new Date(this.now().getTime() - daysAgo * 86400000);
      const price = Math.round(base * (0.7 + r() * 0.6) * 100) / 100;
      rows.push({
        title: i % 5 === 4 ? `${q.keyword} for parts not working` : q.keyword,
        price,
        shipping: 0,
        soldDate: d.toISOString().slice(0, 10),
        condition: i % 3 === 0 ? "New" : "Pre-Owned",
        url: `https://example.invalid/mock/${hash(q.keyword)}-${i}`,
      });
    }
    return rows;
  }
}
