import { describe, expect, it } from "vitest";
import { type Block, decodeFile, decodeRow, dominantGroup, dominantTypeLabel, encodeBlock, groupTotals, ROW_FIELDS } from "./blocks";
import { blocksToCsv, CSV_HEADER } from "./csv";
import { applyFilter, EMPTY_FILTER } from "../components/EstateFilter";
import { formatAddress, titleCase } from "./format";

const block: Block = {
  id: "1|MARSILING DR",
  blk: "1",
  street: "MARSILING DR",
  town: "WL",
  year: 1973,
  maxFloor: 11,
  units: 159,
  // 1R 2R 3R 4R 5R Exec MG Studio | rentals
  counts: [0, 0, 158, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  postal: "730001",
  lat: 1.4407,
  lng: 103.7757,
  models: [
    { type: 2, model: "I", sales: 306, areaMin: 59, areaMax: 76, areaMedian: 65 },
    { type: 4, model: "ADJ", sales: 1, areaMin: 151, areaMax: 151, areaMedian: 151 },
  ],
};

describe("row encoding", () => {
  it("round-trips a block, including its models", () => {
    expect(decodeRow(encodeBlock(block))).toEqual(block);
  });

  it("reads rows written before models were added", () => {
    expect(decodeRow(encodeBlock(block).slice(0, -1)).models).toEqual([]);
  });

  it("rejects a data file with a different field layout", () => {
    expect(() => decodeFile({ fields: ["blk"], rows: [] })).toThrow(/fetch-data/);
    expect(decodeFile({ fields: ROW_FIELDS, rows: [encodeBlock(block)] })).toEqual([block]);
  });
});

describe("mix helpers", () => {
  it("totals counts by colour group", () => {
    expect(groupTotals(block)).toEqual({ small: 0, r3: 158, r4: 0, r5: 1, large: 0, rental: 0 });
  });

  it("finds the dominant group and type", () => {
    expect(dominantGroup(block)).toBe("r3");
    expect(dominantTypeLabel(block)).toBe("3-room");
  });

  it("groups all rental types together", () => {
    const rental = { ...block, counts: [0, 0, 10, 0, 0, 0, 0, 0, 6, 6, 0, 0] };
    expect(dominantGroup(rental)).toBe("rental");
    expect(dominantTypeLabel(rental)).toBe("3-room");
  });

  it("handles blocks with no units", () => {
    const empty = { ...block, counts: new Array(12).fill(0) };
    expect(dominantGroup(empty)).toBeNull();
    expect(dominantTypeLabel(empty)).toBe("—");
  });
});

describe("blocksToCsv", () => {
  it("writes a header and one row per block", () => {
    const lines = blocksToCsv([block]).trim().split("\r\n");
    expect(lines[0]).toBe(CSV_HEADER.join(","));
    expect(lines[1]).toBe(
      "1,MARSILING DR,Woodlands,730001,1973,11,159,0,0,158,0,1,0,0,0,0,0,0,0,3-room," +
        ",,,,3I Improved,59–76,,,Adjoined flat,151,,,," +
        ",1.4407,103.7757",
    );
    expect(lines[0]).toContain("3_room_models,3_room_floor_area_sqm");
  });

  it("quotes commas and neutralises formula-like cells", () => {
    const csv = blocksToCsv([{ ...block, street: "A, B", blk: "=1+1" }]);
    expect(csv).toContain('"A, B"');
    expect(csv).toContain("'=1+1");
  });
});

describe("applyFilter", () => {
  const others = [
    { ...block, id: "2|MARSILING RD", blk: "2", street: "MARSILING RD", year: 1982 },
    { ...block, id: "3|BEDOK RD", blk: "3", street: "BEDOK RD", town: "BD" },
  ];
  const all = [block, ...others];

  it("returns nothing until a town or street is chosen", () => {
    expect(applyFilter(all, EMPTY_FILTER)).toEqual([]);
  });

  it("filters by flat model", () => {
    expect(applyFilter(all, { ...EMPTY_FILTER, town: "WL", models: ["2|I"] }).map((b) => b.blk)).toEqual(["1", "2"]);
    expect(applyFilter(all, { ...EMPTY_FILTER, town: "WL", models: ["3|NG"] })).toEqual([]);
  });

  it("filters by town, street and year range", () => {
    expect(applyFilter(all, { ...EMPTY_FILTER, town: "WL" })).toHaveLength(2);
    expect(applyFilter(all, { ...EMPTY_FILTER, town: "WL", streets: ["MARSILING RD"] }).map((b) => b.blk)).toEqual(["2"]);
    expect(applyFilter(all, { ...EMPTY_FILTER, town: "WL", yearFrom: "1970", yearTo: "1979" }).map((b) => b.blk)).toEqual(["1"]);
  });
});

describe("format", () => {
  it("title-cases street names", () => {
    expect(titleCase("MARSILING DR")).toBe("Marsiling Dr");
    expect(titleCase("C'WEALTH CRES")).toBe("C'wealth Cres");
    expect(formatAddress("1", "MARSILING DR")).toBe("Blk 1 Marsiling Dr");
  });
});
