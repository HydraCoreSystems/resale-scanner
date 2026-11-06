import { tokenize } from "@rs/core";
import type { NameMatch } from "./providers/types";

export interface Candidates {
  /** Best guess first, then up to two alternates. Empty when nothing solid was found. */
  names: string[];
  nothingSolid: boolean;
}

const SITE_SUFFIX = /\s*[|\-–]\s*(ebay|etsy|amazon|walmart|poshmark|mercari|pinterest|facebook|worthpoint|depop|grailed)[^|]*$/i;

export function cleanTitle(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim().replace(SITE_SUFFIX, "").trim();
  if (t.length > 80) {
    t = t.slice(0, 80);
    const cut = t.lastIndexOf(" ");
    if (cut > 40) t = t.slice(0, cut);
  }
  return t;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Picks a best guess and two alternates from raw matches. A title scores by how much the other
 * matches agree with it, so a name several sources share beats one odd long listing title.
 * Reports nothingSolid when fewer than 3 matches came back or the best title has little agreement.
 */
export function pickCandidates(matches: NameMatch[]): Candidates {
  const titles = matches.map((m) => cleanTitle(m.title)).filter((t) => t.length > 2);
  if (titles.length < 3) return { names: titles.slice(0, 3), nothingSolid: true };

  const sets = titles.map((t) => new Set(tokenize(t)));
  const scored = titles.map((t, i) => {
    let score = 0;
    for (let j = 0; j < titles.length; j++) if (i !== j) score += jaccard(sets[i] as Set<string>, sets[j] as Set<string>);
    return { t, i, score: score / (titles.length - 1) };
  });
  scored.sort((a, b) => b.score - a.score || a.t.length - b.t.length);

  const picked: typeof scored = [];
  for (const s of scored) {
    if (picked.some((p) => jaccard(sets[p.i] as Set<string>, sets[s.i] as Set<string>) > 0.8)) continue;
    picked.push(s);
    if (picked.length === 3) break;
  }
  const best = picked[0];
  const nothingSolid = !best || best.score < 0.2;
  return { names: picked.map((p) => p.t), nothingSolid };
}
