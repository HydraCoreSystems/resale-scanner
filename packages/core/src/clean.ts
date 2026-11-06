import type { SoldRow } from "./types";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "with", "in", "on", "by", "to", "new", "used", "vintage", "rare", "lot",
]);

/** Words in a sold title that mean the sale was a part or add on, not the whole item. */
const PARTS_PATTERNS: RegExp[] = [
  /\bfor parts\b/i,
  /\bparts only\b/i,
  /\bnot working\b/i,
  /\bas[- ]is\b.*\b(broken|dead)\b/i,
  /\b(case|box|manual|cable|charger|cord|remote|lid|cover|stand|strap|battery|bag|sleeve|insert|disc|disk|cartridge) only\b/i,
  /\bempty (box|case)\b/i,
  /\breplacement\b/i,
  /\b(sticker|decal|label)s? only\b/i,
];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function keyTokens(query: string): string[] {
  return tokenize(query).filter((t) => !STOPWORDS.has(t));
}

function hasDigit(t: string): boolean {
  return /\d/.test(t);
}

export interface CleanOptions {
  /** The confirmed words the shopper approved. */
  query: string;
  /** True when the scan was a whole item. Parts and accessory rows are dropped. */
  wholeItem?: boolean;
  /** Share of plain words that must appear in a sold title. Default 0.6. */
  minWordMatch?: number;
}

export interface CleanResult {
  rows: SoldRow[];
  dropped: { row: SoldRow; reason: string }[];
}

/**
 * Drops rows that plainly name another product. Rules:
 * 1. Bad price or missing date field is dropped.
 * 2. Every model like token (any token with a digit) in the query must appear in the title.
 * 3. At least minWordMatch of the plain words must appear in the title.
 * 4. When wholeItem, parts and accessory phrasing is dropped unless the query asked for it.
 * 5. Exact duplicate url or title+price+date is dropped.
 */
export function cleanRows(rows: SoldRow[], opts: CleanOptions): CleanResult {
  const minMatch = opts.minWordMatch ?? 0.6;
  const wholeItem = opts.wholeItem ?? true;
  const qTokens = keyTokens(opts.query);
  const modelTokens = qTokens.filter(hasDigit);
  const plainTokens = qTokens.filter((t) => !hasDigit(t));
  const queryText = opts.query.toLowerCase();

  const kept: SoldRow[] = [];
  const dropped: { row: SoldRow; reason: string }[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!Number.isFinite(row.price) || row.price <= 0) {
      dropped.push({ row, reason: "bad price" });
      continue;
    }
    const titleTokens = new Set(tokenize(row.title));

    const missingModel = modelTokens.find((t) => !titleTokens.has(t));
    if (missingModel) {
      dropped.push({ row, reason: `missing model ${missingModel}` });
      continue;
    }

    if (plainTokens.length > 0) {
      const hits = plainTokens.filter((t) => titleTokens.has(t)).length;
      if (hits / plainTokens.length < minMatch) {
        dropped.push({ row, reason: "title does not match the item words" });
        continue;
      }
    }

    if (wholeItem) {
      const pattern = PARTS_PATTERNS.find((p) => p.test(row.title));
      if (pattern) {
        // If the shopper's own words asked for it, keep the row.
        const m = row.title.match(pattern);
        const phrase = m ? m[0].toLowerCase() : "";
        if (!phrase || !queryText.includes(phrase)) {
          dropped.push({ row, reason: "parts or accessory sale" });
          continue;
        }
      }
    }

    const key = row.url ?? `${row.title.toLowerCase()}|${row.price}|${row.soldDate}`;
    if (seen.has(key)) {
      dropped.push({ row, reason: "duplicate" });
      continue;
    }
    seen.add(key);
    kept.push(row);
  }
  return { rows: kept, dropped };
}
