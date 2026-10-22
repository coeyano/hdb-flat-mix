import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { type BlocksFile, decodeFile } from "./blocks";
import { modelInfo } from "./flatModels";
import { FLAT_TYPES } from "./flatTypes";
import planSizes from "./planSizes.json";
import { commonsPageUrl, planImagePath, TYPICAL_PLANS, typicalPlanFor } from "./typicalPlans";

const publicDir = new URL("../../public/", import.meta.url);

describe("typical plans", () => {
  it("have unique ids and one plan per flat type + model", () => {
    expect(new Set(TYPICAL_PLANS.map((p) => p.id)).size).toBe(TYPICAL_PLANS.length);
    expect(new Set(TYPICAL_PLANS.map((p) => `${p.typeKey}|${p.model}`)).size).toBe(TYPICAL_PLANS.length);
  });

  it("refer to real flat types and known models", () => {
    for (const p of TYPICAL_PLANS) {
      expect(FLAT_TYPES.some((t) => t.key === p.typeKey), p.id).toBe(true);
      // Unknown model ids fall back to their own id as the name.
      expect(modelInfo(p.model).name, p.id).not.toBe(p.model);
    }
  });

  it("each have a downloaded image", () => {
    for (const p of TYPICAL_PLANS) {
      const file = new URL(planImagePath(p), publicDir);
      expect(fs.existsSync(file), `${planImagePath(p)} missing; run npm run fetch-plans`).toBe(true);
      expect(fs.statSync(file).size).toBeGreaterThan(3_000);
      expect((planSizes as Record<string, number[]>)[p.id], `${p.id} has no recorded size`).toHaveLength(2);
    }
  });

  it("keep crops inside the page", () => {
    for (const p of TYPICAL_PLANS.filter((x) => x.crop)) {
      const c = p.crop!;
      expect(c.left + c.width).toBeLessThanOrEqual(1);
      expect(c.top + c.height).toBeLessThanOrEqual(1);
    }
  });

  it("link to the exact Commons page", () => {
    const p = typicalPlanFor("r3", "NG")!;
    expect(p.label).toMatch(/3-Room New Generation/);
    expect(commonsPageUrl(p)).toBe(
      "https://commons.wikimedia.org/w/index.php?title=File%3AHousing%20and%20Development%20Board%20Annual%20Reports%20(1972-1975).pdf&page=322",
    );
    expect(typicalPlanFor("r4", "PA")).toBeUndefined();
  });

  it("cover every model in the 1970s Marsiling blocks except the adjoined flats", () => {
    const file = JSON.parse(fs.readFileSync(new URL("data/blocks.json", publicDir), "utf8")) as BlocksFile;
    const models = decodeFile(file)
      .filter((b) => b.street.startsWith("MARSILING") && b.year >= 1970 && b.year <= 1979)
      .flatMap((b) => b.models)
      .filter((m) => m.model !== "ADJ");
    const missing = models.filter((m) => !typicalPlanFor(FLAT_TYPES[m.type].key, m.model));
    expect(missing).toEqual([]);
  });
});
