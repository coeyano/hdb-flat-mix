import { describe, expect, it } from "vitest";
import type { Block } from "../../src/lib/blocks";
import { attachModels, emptySummary, findOverlaps, median, monthRange, summariseResales, toBlockModels } from "./resale";

const sale = (block: string, street: string, type: string, model: string, area: string) => ({
  block,
  street_name: street,
  flat_type: type,
  flat_model: model,
  floor_area_sqm: area,
});

const rows = [
  sale("1", "MARSILING DR", "3 ROOM", "IMPROVED", "59"),
  sale("1", "MARSILING DR", "3 ROOM", "Improved", "65"),
  sale("1", "MARSILING DR", "3 ROOM", "IMPROVED", "76"),
  sale("1", "MARSILING DR", "5 ROOM", "ADJOINED FLAT", "151"),
  sale("22", "MARSILING DR", "4 ROOM", "New Generation", "92"),
  sale("9", "TANGLIN HALT RD", "3 ROOM", "STANDARD", "54"), // demolished block
  sale("1", "MARSILING DR", "STUDIO", "IMPROVED", "40"), // unknown flat type
  sale("1", "MARSILING DR", "3 ROOM", "", "60"), // missing model
  sale("1", "MARSILING DR", "3 ROOM", "Space Pod", "60"),
];

describe("summariseResales", () => {
  it("tallies sales by block, type and model, merging datasets", () => {
    const summary = summariseResales(rows.slice(0, 4));
    summariseResales(rows.slice(4), summary);
    expect(summary.sales).toBe(9);
    expect(summary.skipped).toBe(2);
    expect(summary.unknownModels).toEqual(new Set(["Space Pod"]));
    const block1 = summary.byBlock.get("1|MARSILING DR")!;
    expect(block1.get("2|I")?.areas).toEqual([59, 65, 76]);
    expect(block1.get("4|ADJ")?.areas).toEqual([151]);
  });
});

describe("toBlockModels", () => {
  it("summarises areas and orders by flat type then sales", () => {
    const summary = summariseResales(rows);
    const models = toBlockModels(summary.byBlock.get("1|MARSILING DR")!.values());
    expect(models[0]).toEqual({ type: 2, model: "I", sales: 3, areaMin: 59, areaMax: 76, areaMedian: 65 });
    expect(models.map((m) => m.model)).toEqual(["I", "SPACE POD", "ADJ"]);
  });

  it("computes medians for odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("attachModels", () => {
  const block = (blk: string, counts: number[]): Block => ({
    id: `${blk}|MARSILING DR`,
    blk,
    street: "MARSILING DR",
    town: "WL",
    year: 1975,
    maxFloor: 12,
    units: 100,
    counts,
    postal: null,
    lat: null,
    lng: null,
    models: [],
  });
  const c = (r3: number, r4: number, rent1 = 0) => [0, 0, r3, r4, 0, 0, 0, 0, rent1, 0, 0, 0];

  it("adds models to matching blocks without mutating the input and reports coverage", () => {
    const input = [block("1", c(158, 0)), block("22", c(166, 24)), block("3", c(0, 0, 456))];
    const { blocks, stats } = attachModels(input, summariseResales(rows, emptySummary()));
    expect(input[0].models).toEqual([]);
    expect(blocks[0].models.length).toBe(3);
    expect(blocks[1].models).toEqual([{ type: 3, model: "NG", sales: 1, areaMin: 92, areaMax: 92, areaMedian: 92 }]);
    expect(blocks[2].models).toEqual([]);
    // Sold slots: blk 1 3-room, blk 22 3-room + 4-room (rentals don't count); blk 22 3-room has no model.
    expect(stats).toEqual({ blocksWithModels: 2, blocksWithSoldFlats: 2, matchedSales: 6, soldSlots: 3, slotsWithModel: 2 });
  });
});

describe("dataset overlap check", () => {
  it("finds the month range of a dataset", () => {
    expect(monthRange([{ month: "2015-03" }, { month: "2014-12" }, { month: "" }])).toEqual({ from: "2014-12", to: "2015-03" });
    expect(monthRange([])).toBeNull();
  });

  it("flags overlapping ranges only", () => {
    const ranges = [
      { name: "B", from: "2000-01", to: "2012-02" },
      { name: "A", from: "1990-01", to: "1999-12" },
      { name: "C", from: "2012-01", to: "2014-12" },
    ];
    expect(findOverlaps(ranges)).toEqual(["B and C overlap"]);
  });
});
