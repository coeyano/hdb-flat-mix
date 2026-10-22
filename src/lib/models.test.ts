import { describe, expect, it } from "vitest";
import type { Block } from "./blocks";
import { isKnownModel, modelCode, modelId, modelInfo, resaleTypeKey } from "./flatModels";
import { buildModelGuide, formatArea, labelModel, modelCodes, modelKey } from "./models";

describe("flatModels", () => {
  it("maps resale model names to ids in any case", () => {
    expect(modelId("NEW GENERATION")).toBe("NG");
    expect(modelId("New Generation")).toBe("NG");
    expect(modelId("Model A-Maisonette")).toBe("AM");
    expect(isKnownModel("improved")).toBe(true);
  });

  it("keeps unknown models readable", () => {
    expect(modelId("Space Pod")).toBe("SPACE POD");
    expect(isKnownModel("Space Pod")).toBe(false);
    expect(modelInfo("SPACE POD")).toEqual({ id: "SPACE POD", name: "Space Pod", code: null });
  });

  it("builds the usual short codes", () => {
    expect(modelCode("r3", "NG")).toBe("3NG");
    expect(modelCode("r4", "A")).toBe("4A");
    expect(modelCode("r3", "STD")).toBe("3STD");
    expect(modelCode("exec", "APT")).toBe("EA");
    expect(modelCode("exec", "M")).toBe("EM");
    expect(modelCode("r5", "ADJ")).toBeNull();
    expect(modelCode("studio", "NG")).toBeNull();
  });

  it("maps resale flat types, including both multi-generation spellings", () => {
    expect(resaleTypeKey("3 ROOM")).toBe("r3");
    expect(resaleTypeKey("EXECUTIVE")).toBe("exec");
    expect(resaleTypeKey("MULTI GENERATION")).toBe("multigen");
    expect(resaleTypeKey("MULTI-GENERATION")).toBe("multigen");
    expect(resaleTypeKey("STUDIO")).toBeNull();
  });
});

const base = { postal: null, lat: null, lng: null, counts: new Array(12).fill(0), town: "WL", maxFloor: 12, units: 100 };
const blocks: Block[] = [
  { ...base, id: "1|A", blk: "1", street: "A", year: 1975, models: [{ type: 2, model: "NG", sales: 10, areaMin: 67, areaMax: 82, areaMedian: 67 }] },
  {
    ...base,
    id: "2|A",
    blk: "2",
    street: "A",
    year: 1979,
    models: [
      { type: 2, model: "NG", sales: 5, areaMin: 68, areaMax: 68, areaMedian: 68 },
      { type: 3, model: "NG", sales: 3, areaMin: 92, areaMax: 92, areaMedian: 92 },
    ],
  },
  { ...base, id: "3|A", blk: "3", street: "A", year: 1990, models: [{ type: 4, model: "ADJ", sales: 1, areaMin: 151, areaMax: 151, areaMedian: 151 }] },
];

describe("model labels", () => {
  it("labels models with and without codes", () => {
    expect(labelModel(2, "NG")).toEqual({ code: "3NG", name: "New Generation", short: "3NG" });
    expect(labelModel(4, "ADJ")).toEqual({ code: null, name: "Adjoined flat", short: "5-room Adjoined flat" });
  });

  it("formats floor areas as a single value or a range", () => {
    expect(formatArea({ areaMin: 67, areaMax: 82 })).toBe("67–82 m²");
    expect(formatArea({ areaMin: 92, areaMax: 92.2 })).toBe("92 m²");
  });

  it("lists a block's model codes", () => {
    expect(modelCodes(blocks[1])).toBe("3NG, 4NG");
    expect(modelKey(blocks[1].models[1])).toBe("3|NG");
  });
});

describe("buildModelGuide", () => {
  it("summarises each type + model across blocks", () => {
    const guide = buildModelGuide(blocks);
    expect(guide.map((g) => g.label.short)).toEqual(["3NG", "4NG", "5-room Adjoined flat"]);
    expect(guide[0]).toMatchObject({ blocks: 2, sales: 15, areaMedian: 68, yearFrom: 1975, yearTo: 1979 });
    expect(guide[1]).toMatchObject({ blocks: 1, areaLow: 92, areaHigh: 92 });
  });
});
