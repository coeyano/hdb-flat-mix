/**
 * Download HDB's typical floor plans from Wikimedia Commons: `npm run fetch-plans`
 *
 * For each entry in src/lib/typicalPlans.ts this renders the PDF page via Commons,
 * checks the file's licence is still the one we credit, crops if needed, and writes
 * public/plans/<id>.webp. Re-run only if the list of plans changes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { TYPICAL_PLANS, type TypicalPlan } from "../src/lib/typicalPlans";

import { sleep } from "./lib/http";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(root, "public", "plans");
const SIZES_FILE = path.join(root, "src", "lib", "planSizes.json");
const API = "https://commons.wikimedia.org/w/api.php";
const HEADERS = { "User-Agent": "hdb-flat-mix/1.0 (https://github.com/coeyano/hdb-flat-mix)" };
const RENDER_WIDTH = 1280; // capped at the document's own page width, which Commons won't exceed
const MAX_OUTPUT_WIDTH = 1200;

const looksLike = {
  json: (b: Buffer) => b[0] === 0x7b,
  image: (b: Buffer) => b[0] === 0xff || b[0] === 0x89,
  pdf: (b: Buffer) => b.subarray(0, 5).toString() === "%PDF-",
};

async function get(url: string, expect: keyof typeof looksLike, timeoutMs = 60_000): Promise<Buffer> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) }).catch(() => null);
    if (res?.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (looksLike[expect](buf)) return buf;
    }
    await sleep(10_000 * (attempt + 1)); // Commons rate-limits bursts
  }
  throw new Error(`Could not download ${url}`);
}

const DOWNLOADS = path.join(root, "scripts", ".downloads");

interface ScanImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** The largest image on a page of the original PDF (scanned books hold one image per page). */
async function originalPageImage(plan: TypicalPlan, pdfUrl: string): Promise<Buffer> {
  fs.mkdirSync(DOWNLOADS, { recursive: true });
  const cached = path.join(DOWNLOADS, plan.source.file.replace(/[^\w.-]+/g, "_"));
  if (!fs.existsSync(cached)) {
    console.log(`  downloading ${plan.source.file} (this can be large)…`);
    fs.writeFileSync(cached, await get(pdfUrl, "pdf", 600_000));
  }
  const task = getDocument({ data: new Uint8Array(fs.readFileSync(cached)) });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(plan.page);
    const ops = await page.getOperatorList();
    const scans: ScanImage[] = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] !== OPS.paintImageXObject) continue;
      const img = await new Promise<Partial<ScanImage> | null>((resolve) => page.objs.get(ops.argsArray[i][0] as string, resolve));
      if (img?.data && img.width && img.height) scans.push({ width: img.width, height: img.height, data: img.data });
    }
    const best = scans.sort((x, y) => y.width * y.height - x.width * x.height)[0];
    if (!best) throw new Error(`No scanned image on page ${plan.page} of ${plan.source.file}`);
    const channels = best.data.length / (best.width * best.height);
    if (channels !== 1 && channels !== 3 && channels !== 4) throw new Error(`Unexpected image format on page ${plan.page}`);
    return sharp(Buffer.from(best.data), { raw: { width: best.width, height: best.height, channels } }).png().toBuffer();
  } finally {
    await task.destroy();
  }
}

interface ImageInfo {
  url: string;
  thumburl: string;
  width: number;
  extmetadata?: { LicenseShortName?: { value: string } };
}

async function pageInfo(plan: TypicalPlan, width = RENDER_WIDTH): Promise<ImageInfo> {
  const params = new URLSearchParams({
    action: "query",
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlparam: `page${plan.page}-${width}px`,
    titles: `File:${plan.source.file}`,
    format: "json",
  });
  type Body = { error?: { info?: string }; query?: { pages: Record<string, { missing?: string; imageinfo?: ImageInfo[] }> } };
  // The API reports rate limits and lag as HTTP 200 with an "error" body, so retry those too.
  for (let attempt = 0; attempt < 5; attempt++) {
    const body = JSON.parse((await get(`${API}?${params}`, "json")).toString()) as Body;
    if (body.error || !body.query) {
      await sleep(15_000 * (attempt + 1));
      continue;
    }
    const page = Object.values(body.query.pages)[0];
    if (page.missing !== undefined || !page.imageinfo?.[0]) throw new Error(`${plan.source.file} is no longer on Commons`);
    const info = page.imageinfo[0];
    if (!info.thumburl) throw new Error(`Commons can't render page ${plan.page} of ${plan.source.file}; check the page number`);
    return info;
  }
  throw new Error(`Commons API kept refusing requests for ${plan.source.file}`);
}

async function fetchPlan(plan: TypicalPlan): Promise<number> {
  // Asking for more than the page's own width gets a small fallback image, so ask again at its width.
  let info = await pageInfo(plan);
  if (info.width && info.width < RENDER_WIDTH) {
    await sleep(2_000);
    info = await pageInfo(plan, info.width);
  }
  const licence = info.extmetadata?.LicenseShortName?.value ?? "unknown";
  if (licence !== plan.source.licence) {
    throw new Error(`${plan.source.file} is now licensed "${licence}", not "${plan.source.licence}". Review before using it.`);
  }
  await sleep(3_000);
  const source = plan.source.fromOriginalPdf ? await originalPageImage(plan, info.url) : await get(info.thumburl, "image");
  let image = sharp(source);
  if (plan.crop) {
    const { width = 0, height = 0 } = await image.metadata();
    const left = Math.round(plan.crop.left * width);
    const top = Math.round(plan.crop.top * height);
    image = image.extract({
      left,
      top,
      width: Math.min(Math.round(plan.crop.width * width), width - left),
      height: Math.min(Math.round(plan.crop.height * height), height - top),
    });
  }
  const out = await image
    .resize({ width: MAX_OUTPUT_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, `${plan.id}.webp`), out);
  return out.length;
}

/** Record each image's pixel size so the page can reserve space before it loads. */
async function writeSizes() {
  const sizes: Record<string, [number, number]> = {};
  for (const plan of TYPICAL_PLANS) {
    const file = path.join(OUT_DIR, `${plan.id}.webp`);
    if (!fs.existsSync(file)) continue;
    const { width = 0, height = 0 } = await sharp(file).metadata();
    sizes[plan.id] = [width, height];
  }
  fs.writeFileSync(SIZES_FILE, JSON.stringify(sizes, null, 1) + "\n");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const plans = only.length ? TYPICAL_PLANS.filter((p) => only.includes(p.id)) : TYPICAL_PLANS;
  let total = 0;
  for (const plan of plans) {
    const bytes = await fetchPlan(plan);
    total += bytes;
    console.log(`  ${plan.id.padEnd(5)} ${plan.label} — ${(bytes / 1024).toFixed(0)} KB`);
    await sleep(3_000);
  }
  await writeSizes();
  console.log(`Saved ${plans.length} plans (${(total / 1024 / 1024).toFixed(1)} MB) to public/plans/`);
}

main().catch((err) => {
  console.error(`\nPlan download failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
