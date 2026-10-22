import { describe, expect, it } from "vitest";
import type { Block } from "./blocks";
import { MIX_GROUPS } from "./flatTypes";
import { blockColour, legendFor, YEAR_BANDS } from "./mapColours";
import { READING_LIST } from "./readingList";

const block = (year: number, counts: number[]): Block => ({
  id: "1|A",
  blk: "1",
  street: "A",
  town: "WL",
  year,
  maxFloor: 12,
  units: 100,
  counts,
  postal: null,
  lat: 1.44,
  lng: 103.77,
  models: [],
});
const threeRoom = [0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0];

describe("blockColour", () => {
  it("colours by year band, older darker", () => {
    expect(blockColour(block(1965, threeRoom), "year")).toBe(YEAR_BANDS[0].color);
    expect(blockColour(block(1973, threeRoom), "year")).toBe(YEAR_BANDS[1].color);
    expect(blockColour(block(1979, threeRoom), "year")).toBe(YEAR_BANDS[1].color);
    expect(blockColour(block(1980, threeRoom), "year")).toBe(YEAR_BANDS[2].color);
    expect(blockColour(block(2026, threeRoom), "year")).toBe(YEAR_BANDS[4].color);
  });

  it("colours by main flat type", () => {
    expect(blockColour(block(1973, threeRoom), "type")).toBe(MIX_GROUPS.find((g) => g.key === "r3")!.color);
  });

  it("greys out blocks with no year or no units", () => {
    expect(blockColour(block(0, threeRoom), "year")).toBe("#c3c2b7");
    expect(blockColour(block(1973, new Array(12).fill(0)), "type")).toBe("#c3c2b7");
  });

  it("gives a legend for each mode", () => {
    expect(legendFor("year")).toHaveLength(5);
    expect(legendFor("type")).toBe(MIX_GROUPS);
  });
});

describe("reading list", () => {
  const items = READING_LIST.flatMap((s) => s.items);

  it("has every reference from the studio list, each once", () => {
    expect(items).toHaveLength(23);
    expect(new Set(items.map((i) => i.url)).size).toBe(items.length);
  });

  it("uses https and points archived items at a dated Internet Archive copy", () => {
    for (const item of items) {
      expect(item.url, item.title).toMatch(/^https:\/\//);
      if (item.status === "archived") expect(item.url, item.title).toMatch(/^https:\/\/web\.archive\.org\/web\/\d{14}\/https:\/\//);
      else expect(item.url, item.title).not.toMatch(/archive\.org/);
    }
  });
});
