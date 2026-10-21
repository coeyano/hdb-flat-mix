import { type Block, compareBlockNo } from "./blocks";
import { townName } from "./flatTypes";
import { cleanText, normaliseBlock, normaliseStreet, STREET_EXPANSIONS } from "./street";

export interface BlockIndex {
  blocks: readonly Block[];
  byPostal: ReadonlyMap<string, Block>;
  byKey: ReadonlyMap<string, Block>;
  tokens: readonly string[][]; // searchable tokens per block, same order as `blocks`
}

const tokenise = (text: string) =>
  cleanText(text)
    .replace(/[,#]/g, " ")
    .split(" ")
    .filter(Boolean);

function blockTokens(b: Block): string[] {
  const street = b.street.split(" ");
  const expanded = street.map((w) => STREET_EXPANSIONS[w]).filter(Boolean);
  return [b.blk, ...street, ...expanded, ...tokenise(townName(b.town)), ...(b.postal ? [b.postal] : [])];
}

export function buildIndex(blocks: readonly Block[]): BlockIndex {
  const byPostal = new Map<string, Block>();
  const byKey = new Map<string, Block>();
  for (const b of blocks) {
    if (b.postal) byPostal.set(b.postal, b);
    byKey.set(`${b.blk}|${b.street}`, b);
  }
  return { blocks, byPostal, byKey, tokens: blocks.map(blockTokens) };
}

const FILLER = new Set(["BLK", "BLOCK", "SINGAPORE"]);

/**
 * Autocomplete search. Every query word must be the start of a word in the block's
 * address (block no., street in short or long form, town, postal code).
 */
export function searchBlocks(index: BlockIndex, query: string, limit = 8): Block[] {
  const words = tokenise(query).filter((w) => !FILLER.has(w));
  if (!words.length) return [];

  const scored: { block: Block; score: number }[] = [];
  index.blocks.forEach((block, i) => {
    const tokens = index.tokens[i];
    if (!words.every((w) => tokens.some((t) => t.startsWith(w)))) return;
    let score = 0;
    for (const w of words) {
      if (w === block.blk) score += 3;
      else if (w === block.postal) score += 5;
      else if (tokens.includes(w)) score += 1;
    }
    scored.push({ block, score });
  });

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.block.street.localeCompare(b.block.street) ||
        compareBlockNo(a.block.blk, b.block.blk),
    )
    .slice(0, limit)
    .map((s) => s.block);
}

export type ResolveStatus = "exact" | "postal" | "closest" | "not-found";

export interface ResolvedEntry {
  input: string;
  status: ResolveStatus;
  block: Block | null;
}

/** Resolve one pasted line: a postal code, or "<block> <street>" in any spelling. */
export function resolveEntry(index: BlockIndex, line: string): ResolvedEntry {
  const input = line.trim();
  // Drop unit numbers (#05-12), "Singapore" and stray punctuation before parsing.
  const text = cleanText(
    input
      .replace(/#\s*\d+\s*-\s*\d+\w*/g, " ")
      .replace(/\bsingapore\b/gi, " ")
      .replace(/[,.;:]/g, " "),
  );

  const postal = text.match(/\b\d{6}\b/)?.[0];
  if (postal) {
    const block = index.byPostal.get(postal) ?? null;
    return { input, status: block ? "postal" : "not-found", block };
  }

  const parsed = text.replace(/^(BLK|BLOCK)\s+/, "").match(/^([0-9]+[A-Z]?)\s+(.+)$/);
  if (parsed) {
    const block = index.byKey.get(`${normaliseBlock(parsed[1])}|${normaliseStreet(parsed[2])}`);
    if (block) return { input, status: "exact", block };
  }

  // Fall back to search, accepting only a single clear candidate with the same block no.
  // Exact block-number hits score highest, so the top two are enough to spot ambiguity.
  const blk = parsed ? normaliseBlock(parsed[1]) : null;
  const hits = searchBlocks(index, text, 2);
  const candidates = blk ? hits.filter((h) => h.blk === blk) : hits;
  if (candidates.length === 1) return { input, status: "closest", block: candidates[0] };
  return { input, status: "not-found", block: null };
}

export function parseBatchInput(text: string): string[] {
  return text
    .split(/[\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
}
