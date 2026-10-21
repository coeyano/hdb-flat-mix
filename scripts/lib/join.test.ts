import { describe, expect, it } from "vitest";
import { buildingsFromGeoJson, geometryCentroid, inferStreetByOverlap, joinBlocks, parseCsv, ringCentroid } from "./join";

const HEADER =
  "blk_no,street,max_floor_lvl,year_completed,residential,commercial,market_hawker,miscellaneous,multistorey_carpark,precinct_pavilion,bldg_contract_town,total_dwelling_units,1room_sold,2room_sold,3room_sold,4room_sold,5room_sold,exec_sold,multigen_sold,studio_apartment_sold,1room_rental,2room_rental,3room_rental,other_room_rental";
const CSV = [
  HEADER,
  "1,MARSILING DR,11,1973,Y,N,N,Y,N,N,WL,159,0,0,158,0,1,0,0,0,0,0,0,0",
  "10,MARSILING DR,22,1975,Y,Y,N,N,N,N,WL,84,0,0,0,0,84,0,0,0,0,0,0,0",
  "134A,TENGAH GDN AVE,16,2026,Y,N,N,N,N,N,TG,100,0,0,0,100,0,0,0,0,0,0,0,0",
  "5,MARSILING DR,1,1975,N,N,N,N,Y,N,WL,0,0,0,0,0,0,0,0,0,0,0,0,0",
].join("\r\n");

const square = (x: number, y: number, d = 0.001) => [
  [x, y],
  [x + d, y],
  [x + d, y + d],
  [x, y + d],
  [x, y],
];

const geojson = {
  features: [
    { properties: { BLK_NO: "1", ST_COD: "MAD07G", POSTAL_COD: "730001" }, geometry: { type: "Polygon", coordinates: [square(103.77, 1.44)] } },
    { properties: { BLK_NO: "10", ST_COD: "MAD07G", POSTAL_COD: 730010 }, geometry: { type: "Polygon", coordinates: [square(103.78, 1.44)] } },
    { properties: { BLK_NO: "5", ST_COD: "MAD07G", POSTAL_COD: "730005" }, geometry: { type: "Polygon", coordinates: [square(103.79, 1.44)] } },
    { properties: { BLK_NO: "9", ST_COD: "XXX00X", POSTAL_COD: "999009" }, geometry: null },
  ],
};

describe("parseCsv", () => {
  it("parses rows into objects keyed by header", () => {
    const rows = parseCsv(CSV);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ blk_no: "1", street: "MARSILING DR", "3room_sold": "158" });
  });

  it("handles quoted fields, BOMs and a missing trailing newline", () => {
    expect(parseCsv('﻿a,b\n"x, ""y""",2')).toEqual([{ a: 'x, "y"', b: "2" }]);
    expect(parseCsv("")).toEqual([]);
  });
});

describe("centroids", () => {
  it("computes the centre of a square ring", () => {
    const c = ringCentroid(square(0, 0, 2));
    expect(c.lng).toBeCloseTo(1);
    expect(c.lat).toBeCloseTo(1);
    expect(c.area).toBeCloseTo(4);
  });

  it("uses the largest part of a MultiPolygon", () => {
    const c = geometryCentroid({ type: "MultiPolygon", coordinates: [[square(0, 0, 1)], [square(10, 10, 4)]] });
    expect(c?.lng).toBeCloseTo(12);
  });

  it("falls back to the vertex average for degenerate rings", () => {
    expect(ringCentroid([[1, 1], [1, 1], [1, 1]])).toMatchObject({ lng: 1, lat: 1, area: 0 });
    expect(geometryCentroid({ type: "Point", coordinates: [1, 1] })).toBeNull();
  });
});

describe("buildingsFromGeoJson", () => {
  it("extracts block, street code, padded postal and centroid, skipping features without geometry", () => {
    const buildings = buildingsFromGeoJson(geojson);
    expect(buildings).toHaveLength(3);
    expect(buildings[1]).toMatchObject({ blk: "10", stCod: "MAD07G", postal: "730010" });
    expect(buildings[0].lat).toBeCloseTo(1.4405, 4);
  });
});

describe("inferStreetByOverlap", () => {
  const byStreet = new Map([
    ["MARSILING DR", new Set(["1", "2", "3", "4", "10"])],
    ["MARSILING RD", new Set(["1", "2", "30", "31"])],
  ]);

  it("returns the street that clearly owns the code's blocks", () => {
    expect(inferStreetByOverlap(new Set(["1", "2", "3", "4", "10"]), byStreet)).toBe("MARSILING DR");
  });

  it("returns null when the overlap is ambiguous or weak", () => {
    expect(inferStreetByOverlap(new Set(["1", "2"]), byStreet)).toBeNull();
    expect(inferStreetByOverlap(new Set(["99"]), byStreet)).toBeNull();
  });
});

describe("joinBlocks", () => {
  const rows = parseCsv(CSV);
  const buildings = buildingsFromGeoJson(geojson);

  it("joins residential rows to buildings via the street-code map", () => {
    const { blocks, unmatched } = joinBlocks(rows, buildings, { MAD07G: "MARSILING DR" });
    expect(blocks.map((b) => b.id)).toEqual(["1|MARSILING DR", "10|MARSILING DR", "134A|TENGAH GDN AVE"]);
    expect(blocks[0]).toMatchObject({ postal: "730001", year: 1973, units: 159, town: "WL" });
    expect(blocks[0].counts.slice(0, 5)).toEqual([0, 0, 158, 0, 1]);
    expect(unmatched.map((b) => b.id)).toEqual(["134A|TENGAH GDN AVE"]);
  });

  it("skips non-residential rows and reports unused building outlines", () => {
    const { blocks, unusedBuildings } = joinBlocks(rows, buildings, { MAD07G: "MARSILING DR" });
    expect(blocks.some((b) => b.blk === "5")).toBe(false);
    expect(unusedBuildings.map((b) => b.blk)).toEqual(["5"]);
  });

  it("uses extra OneMap locations for blocks missing from the outlines", () => {
    const { unmatched, blocks } = joinBlocks(rows, buildings, { MAD07G: "MARSILING DR" }, {
      "134A|TENGAH GDN AVE": { postal: "691134", lat: 1.355, lng: 103.73 },
    });
    expect(unmatched).toEqual([]);
    expect(blocks.find((b) => b.blk === "134A")?.postal).toBe("691134");
  });

  it("leaves blocks unmatched when their street code is unknown", () => {
    expect(joinBlocks(rows, buildings, {}).unmatched).toHaveLength(3);
  });
});
