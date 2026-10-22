import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { checkPlanFile, detectKind, MAX_PLAN_BYTES } from "./fileKind";
import { addPlan, allPlans, getPlan, plansForBlock, removePlan } from "./planStore";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("detectKind", () => {
  it("recognises PDFs and common image formats by their first bytes", () => {
    expect(detectKind(bytes("%PDF-1.7"))).toBe("pdf");
    expect(detectKind(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image");
    expect(detectKind(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("image");
    expect(detectKind(bytes("GIF89a"))).toBe("image");
    expect(detectKind(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "))).toBe("image");
  });

  it("rejects anything else, even if it claims to be a PDF", () => {
    expect(detectKind(bytes("<html>"))).toBeNull();
    expect(detectKind(bytes("RIFF", [0, 0, 0, 0], "WAVE"))).toBeNull();
    expect(detectKind(new Uint8Array())).toBeNull();
  });
});

describe("checkPlanFile", () => {
  it("accepts a real PDF and re-types it by its contents", async () => {
    const check = await checkPlanFile(new Blob([bytes("%PDF-1.4 rest")], { type: "text/html" }));
    expect(check).toMatchObject({ ok: true, kind: "pdf" });
    expect(check.ok && check.file.type).toBe("application/pdf");
    expect(check.ok && check.file.size).toBe(13);
  });

  it("types images by their contents, not their names", async () => {
    const jpeg = await checkPlanFile(new Blob([bytes([0xff, 0xd8, 0xff, 0xe0])], { type: "application/pdf" }));
    expect(jpeg.ok && jpeg.file.type).toBe("image/jpeg");
  });

  it("explains empty, oversized and unsupported files", async () => {
    expect(await checkPlanFile(new Blob([]))).toMatchObject({ ok: false, message: expect.stringMatching(/empty/) });
    const big = { size: MAX_PLAN_BYTES + 1, slice: () => new Blob([]) } as unknown as Blob;
    expect(await checkPlanFile(big)).toMatchObject({ ok: false, message: expect.stringMatching(/25 MB/) });
    expect(await checkPlanFile(new Blob([bytes("hello world")]))).toMatchObject({
      ok: false,
      message: expect.stringMatching(/Only PDF/),
    });
  });
});

describe("planStore", () => {
  const pdf = new Blob([bytes("%PDF-1.4")], { type: "application/pdf" });

  it("saves, lists, reads and removes plans per block", async () => {
    const a = await addPlan({ blockId: "22|MARSILING DR", slot: "2|NG", name: "3NG.pdf", kind: "pdf", size: 8, file: pdf });
    const b = await addPlan({ blockId: "22|MARSILING DR", slot: "3|NG", name: "4NG.pdf", kind: "pdf", size: 8, file: pdf });
    await addPlan({ blockId: "1|MARSILING DR", slot: "2|I", name: "3I.png", kind: "image", size: 8, file: pdf });

    const forBlock = await plansForBlock("22|MARSILING DR");
    expect(forBlock.map((p) => p.name)).toEqual(["3NG.pdf", "4NG.pdf"]);
    expect(forBlock[0].file.size).toBe(8);

    const all = await allPlans();
    expect(all).toHaveLength(3);
    expect(all[0]).not.toHaveProperty("file");

    expect((await getPlan(a.id))?.slot).toBe("2|NG");
    await removePlan(b.id);
    expect((await plansForBlock("22|MARSILING DR")).map((p) => p.id)).toEqual([a.id]);
    expect(await getPlan(b.id)).toBeUndefined();
  });
});
