import { describe, expect, it } from "vitest";
import type { Block } from "./blocks";
import { buildIndex, parseBatchInput, resolveEntry, searchBlocks } from "./search";

const counts = (r3 = 0, r4 = 0) => [0, 0, r3, r4, 0, 0, 0, 0, 0, 0, 0, 0];
const make = (blk: string, street: string, postal: string | null, town = "WL"): Block => ({
  id: `${blk}|${street}`,
  blk,
  street,
  town,
  year: 1975,
  maxFloor: 12,
  units: 100,
  counts: counts(100),
  postal,
  lat: 1.44,
  lng: 103.77,
  models: [],
});

const blocks = [
  make("1", "MARSILING DR", "730001"),
  make("10", "MARSILING DR", "730010"),
  make("13", "MARSILING RD", "730013"),
  make("13", "MARSILING LANE", "730113"),
  make("123", "BEDOK NTH ST 2", "460123", "BD"),
];
const index = buildIndex(blocks);

describe("searchBlocks", () => {
  it("finds a block by postal code", () => {
    expect(searchBlocks(index, "730010").map((b) => b.id)).toEqual(["10|MARSILING DR"]);
  });

  it("matches full street words against HDB abbreviations", () => {
    expect(searchBlocks(index, "13 Marsiling Road").map((b) => b.id)).toEqual(["13|MARSILING RD"]);
  });

  it("matches partial words while typing", () => {
    const ids = searchBlocks(index, "marsil dr").map((b) => b.id);
    expect(ids).toEqual(["1|MARSILING DR", "10|MARSILING DR"]);
  });

  it("ranks an exact block number first", () => {
    expect(searchBlocks(index, "1 marsiling")[0].id).toBe("1|MARSILING DR");
  });

  it("searches by town name and ignores filler words", () => {
    expect(searchBlocks(index, "blk 123 bedok").map((b) => b.id)).toEqual(["123|BEDOK NTH ST 2"]);
  });

  it("returns nothing for empty or unknown queries", () => {
    expect(searchBlocks(index, "   ")).toEqual([]);
    expect(searchBlocks(index, "Orchard")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(searchBlocks(index, "marsiling", 2)).toHaveLength(2);
  });
});

describe("resolveEntry", () => {
  it("resolves postal codes, including inside a full address", () => {
    expect(resolveEntry(index, "730001")).toMatchObject({ status: "postal", block: { id: "1|MARSILING DR" } });
    expect(resolveEntry(index, "1 Marsiling Drive, Singapore 730001").block?.id).toBe("1|MARSILING DR");
  });

  it("resolves block + street in either spelling", () => {
    expect(resolveEntry(index, "Blk 13 Marsiling Road")).toMatchObject({ status: "exact", block: { id: "13|MARSILING RD" } });
    expect(resolveEntry(index, "13 MARSILING LANE").block?.id).toBe("13|MARSILING LANE");
  });

  it("ignores unit numbers, commas and 'Singapore'", () => {
    expect(resolveEntry(index, "13 Marsiling Rd #05-12").block?.id).toBe("13|MARSILING RD");
    expect(resolveEntry(index, "Blk 13, Marsiling Road, Singapore").block?.id).toBe("13|MARSILING RD");
  });

  it("falls back to the single closest match", () => {
    expect(resolveEntry(index, "10 Marsiling")).toMatchObject({ status: "closest", block: { id: "10|MARSILING DR" } });
  });

  it("refuses ambiguous or unknown entries", () => {
    expect(resolveEntry(index, "13 Marsiling").status).toBe("not-found");
    expect(resolveEntry(index, "999999").status).toBe("not-found");
    expect(resolveEntry(index, "5 Orchard Road").status).toBe("not-found");
  });
});

describe("parseBatchInput", () => {
  it("splits on new lines and semicolons and drops blanks", () => {
    expect(parseBatchInput("730001\n\n 13 Marsiling Rd ;730010\r\n")).toEqual(["730001", "13 Marsiling Rd", "730010"]);
  });
});
