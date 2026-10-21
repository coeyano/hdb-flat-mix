// Checks against the real bundled data (public/data), so a bad refresh is caught before deploy.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { type BlocksFile, decodeFile } from "./blocks";
import { applyFilter, EMPTY_FILTER } from "../components/EstateFilter";
import { buildIndex, resolveEntry, searchBlocks } from "./search";

const file = JSON.parse(fs.readFileSync(new URL("../../public/data/blocks.json", import.meta.url), "utf8")) as BlocksFile;
const blocks = decodeFile(file);
const index = buildIndex(blocks);

describe("bundled data", () => {
  it("has every residential block with a postal code and location", () => {
    expect(blocks.length).toBeGreaterThan(10_000);
    const missing = blocks.filter((b) => !b.postal || b.lat == null);
    expect(missing.length / blocks.length).toBeLessThan(0.01);
  });

  it("has unit counts that add up to total dwelling units", () => {
    const mismatched = blocks.filter((b) => b.counts.reduce((s, c) => s + c, 0) !== b.units);
    expect(mismatched.length / blocks.length).toBeLessThan(0.01);
  });

  it("puts every block inside Singapore", () => {
    const outside = blocks.filter((b) => b.lat != null && (b.lat < 1.15 || b.lat > 1.48 || b.lng! < 103.6 || b.lng! > 104.05));
    expect(outside).toEqual([]);
  });

  it("resolves known Marsiling blocks", () => {
    expect(resolveEntry(index, "730001").block).toMatchObject({ blk: "1", street: "MARSILING DR", year: 1973 });
    expect(resolveEntry(index, "10 Marsiling Drive").block?.postal).toBe("730010");
    expect(searchBlocks(index, "marsiling road").every((b) => b.street === "MARSILING RD")).toBe(true);
  });

  it("finds the 1970s Marsiling blocks in Woodlands", () => {
    const marsiling = blocks.filter((b) => b.town === "WL" && b.street.startsWith("MARSILING")).map((b) => b.street);
    const seventies = applyFilter(blocks, { ...EMPTY_FILTER, town: "WL", streets: [...new Set(marsiling)], yearFrom: "1970", yearTo: "1979" });
    expect(seventies.length).toBe(34);
  });
});
