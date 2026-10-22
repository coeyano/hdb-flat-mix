// HDB's own typical floor plans for each flat model, from HDB publications scanned by
// My Community SG and published on Wikimedia Commons. `npm run fetch-plans` downloads and
// crops them into public/plans/; this file is the single list of what is used and credited.
//
// Licences are as stated on Commons by the uploader. HDB is the original publisher; the
// app credits both and labels every drawing as a typical plan, not a specific block's layout.

export interface PlanSource {
  file: string; // Commons file title, without "File:"
  title: string; // how the publication is cited
  licence: "CC0" | "CC BY 4.0";
  // Commons only renders some scans at low resolution; for these the page image is
  // taken from the original PDF instead.
  fromOriginalPdf?: boolean;
}

export const LICENCE_URLS: Readonly<Record<PlanSource["licence"], string>> = {
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
};

export interface TypicalPlan {
  id: string; // also the image file name: public/plans/<id>.webp
  typeKey: string; // FLAT_TYPES key
  model: string; // flat model id
  label: string; // the drawing's own title
  source: PlanSource;
  page: number; // page in the Commons PDF
  crop?: { left: number; top: number; width: number; height: number }; // fractions of the page
}

const AR_1972_75: PlanSource = {
  file: "Housing and Development Board Annual Reports (1972-1975).pdf",
  title: "HDB Annual Reports 1972–1975",
  licence: "CC0",
};
const AR_1980_81: PlanSource = { file: "HDB Annual Report 1980-1981.pdf", title: "HDB Annual Report 1980/81", licence: "CC BY 4.0" };
const AR_1983_84: PlanSource = { file: "HDB Annual Report 1983-1984.pdf", title: "HDB Annual Report 1983/84", licence: "CC BY 4.0" };
const HOUSING_A_NATION: PlanSource = {
  file: "Housing a Nation 25 Years of Public Housing in Singapore (1985).pdf",
  title: "Housing a Nation: 25 Years of Public Housing in Singapore (HDB, 1985)",
  licence: "CC0",
  fromOriginalPdf: true,
};

export const TYPICAL_PLANS: readonly TypicalPlan[] = [
  { id: "1i", typeKey: "r1", model: "I", label: "Typical 1-Room Improved flat", source: AR_1972_75, page: 316 },
  { id: "2i", typeKey: "r2", model: "I", label: "Typical 2-Room Improved flat", source: AR_1972_75, page: 318 },
  {
    id: "2std",
    typeKey: "r2",
    model: "STD",
    label: "2-Room Standard prototype",
    source: HOUSING_A_NATION,
    page: 83,
    crop: { left: 0.37, top: 0.09, width: 0.27, height: 0.255 },
  },
  {
    id: "3std",
    typeKey: "r3",
    model: "STD",
    label: "3-Room Standard prototype",
    source: HOUSING_A_NATION,
    page: 82,
    crop: { left: 0.38, top: 0.345, width: 0.31, height: 0.335 },
  },
  { id: "3i", typeKey: "r3", model: "I", label: "Typical 3-Room Improved flat", source: AR_1972_75, page: 320 },
  { id: "3ng", typeKey: "r3", model: "NG", label: "Typical 3-Room New Generation flat", source: AR_1972_75, page: 322 },
  {
    id: "3a",
    typeKey: "r3",
    model: "A",
    label: "Typical 3-Room Model A flat",
    source: AR_1980_81,
    page: 74,
    crop: { left: 0.04, top: 0.02, width: 0.56, height: 0.63 },
  },
  {
    id: "3s",
    typeKey: "r3",
    model: "S",
    label: "Typical 3-Room Simplified flat",
    source: AR_1983_84,
    page: 80,
    crop: { left: 0.03, top: 0.15, width: 0.52, height: 0.57 },
  },
  { id: "4i", typeKey: "r4", model: "I", label: "Typical 4-Room Improved flat", source: AR_1972_75, page: 324 },
  { id: "4ng", typeKey: "r4", model: "NG", label: "Typical 4-Room New Generation flat", source: AR_1972_75, page: 326 },
  {
    id: "4a",
    typeKey: "r4",
    model: "A",
    label: "Typical 4-Room Model A flat",
    source: AR_1983_84,
    page: 82,
    crop: { left: 0.03, top: 0.15, width: 0.72, height: 0.58 },
  },
  {
    id: "4s",
    typeKey: "r4",
    model: "S",
    label: "Typical 4-Room Simplified flat",
    source: AR_1983_84,
    page: 81,
    crop: { left: 0.02, top: 0.15, width: 0.66, height: 0.57 },
  },
  {
    id: "5std",
    typeKey: "r5",
    model: "STD",
    label: "5-Room Standard prototype",
    source: HOUSING_A_NATION,
    page: 84,
    crop: { left: 0.09, top: 0.08, width: 0.44, height: 0.295 },
  },
  {
    id: "5i",
    typeKey: "r5",
    model: "I",
    label: "Typical 5-Room Improved flat",
    source: AR_1983_84,
    page: 84,
    crop: { left: 0.03, top: 0.15, width: 0.73, height: 0.62 },
  },
  {
    id: "5a",
    typeKey: "r5",
    model: "A",
    label: "Typical 5-Room Model A flat",
    source: AR_1980_81,
    page: 76,
    crop: { left: 0.06, top: 0.02, width: 0.84, height: 0.59 },
  },
  {
    id: "5am",
    typeKey: "r5",
    model: "AM",
    label: "Typical 5-Room Model A Maisonette",
    source: AR_1980_81,
    page: 77,
    crop: { left: 0.03, top: 0.02, width: 0.95, height: 0.63 },
  },
  {
    id: "ea",
    typeKey: "exec",
    model: "APT",
    label: "Typical Executive Apartment",
    source: AR_1983_84,
    page: 86,
    crop: { left: 0.03, top: 0.14, width: 0.89, height: 0.61 },
  },
  {
    id: "em",
    typeKey: "exec",
    model: "M",
    label: "Typical Executive Maisonette",
    source: AR_1983_84,
    page: 88,
    crop: { left: 0.03, top: 0.14, width: 0.95, height: 0.67 },
  },
];

const BY_SLOT = new Map(TYPICAL_PLANS.map((p) => [`${p.typeKey}|${p.model}`, p]));

export function typicalPlanFor(typeKey: string, model: string): TypicalPlan | undefined {
  return BY_SLOT.get(`${typeKey}|${model}`);
}

export const commonsPageUrl = (p: TypicalPlan) =>
  `https://commons.wikimedia.org/w/index.php?title=${encodeURIComponent(`File:${p.source.file}`)}&page=${p.page}`;

export const planImagePath = (p: TypicalPlan) => `plans/${p.id}.webp`;
