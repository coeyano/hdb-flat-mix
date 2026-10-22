// HDB flat models as recorded in the Resale Flat Prices data, with the short codes in
// common use ("3NG", "4A", "EA"). Models without a widely used code have `code: null`.

export interface FlatModel {
  id: string;
  name: string;
  code: string | null;
}

const MODELS: readonly (FlatModel & { raw: string })[] = [
  { raw: "STANDARD", id: "STD", name: "Standard", code: "STD" },
  { raw: "IMPROVED", id: "I", name: "Improved", code: "I" },
  { raw: "NEW GENERATION", id: "NG", name: "New Generation", code: "NG" },
  { raw: "SIMPLIFIED", id: "S", name: "Simplified", code: "S" },
  { raw: "MODEL A", id: "A", name: "Model A", code: "A" },
  { raw: "MODEL A2", id: "A2", name: "Model A2", code: "A2" },
  { raw: "PREMIUM APARTMENT", id: "PA", name: "Premium Apartment", code: "PA" },
  { raw: "PREMIUM APARTMENT LOFT", id: "PAL", name: "Premium Apartment Loft", code: null },
  { raw: "APARTMENT", id: "APT", name: "Apartment", code: "A" },
  { raw: "MAISONETTE", id: "M", name: "Maisonette", code: "M" },
  { raw: "PREMIUM MAISONETTE", id: "PM", name: "Premium Maisonette", code: "PM" },
  { raw: "MODEL A-MAISONETTE", id: "AM", name: "Model A Maisonette", code: "AM" },
  { raw: "IMPROVED-MAISONETTE", id: "IM", name: "Improved Maisonette", code: "IM" },
  { raw: "DBSS", id: "DBSS", name: "DBSS", code: null },
  { raw: "ADJOINED FLAT", id: "ADJ", name: "Adjoined flat", code: null },
  { raw: "TERRACE", id: "T", name: "Terrace", code: null },
  { raw: "TYPE S1", id: "S1", name: "Type S1", code: null },
  { raw: "TYPE S2", id: "S2", name: "Type S2", code: null },
  { raw: "3GEN", id: "3GEN", name: "3Gen", code: null },
  { raw: "2-ROOM", id: "2R", name: "2-room (model not named)", code: null },
  { raw: "MULTI GENERATION", id: "MG", name: "Multi-generation", code: null },
];

const BY_RAW = new Map(MODELS.map((m) => [m.raw, m]));
const BY_ID = new Map(MODELS.map((m) => [m.id, m]));

const cleanModel = (raw: string) => raw.toUpperCase().replace(/\s+/g, " ").trim();

/** Model id for a raw `flat_model` value; unknown models keep their cleaned raw name. */
export function modelId(raw: string): string {
  const clean = cleanModel(raw);
  return BY_RAW.get(clean)?.id ?? clean;
}

export function isKnownModel(raw: string): boolean {
  return BY_RAW.has(cleanModel(raw));
}

export function modelInfo(id: string): FlatModel {
  const known = BY_ID.get(id);
  if (known) return { id, name: known.name, code: known.code };
  const name = id.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return { id, name, code: null };
}

// Prefix for codes, by FLAT_TYPES key: 3-room New Generation → "3NG", Executive Apartment → "EA".
const TYPE_PREFIX: Readonly<Record<string, string>> = {
  r1: "1",
  r2: "2",
  r3: "3",
  r4: "4",
  r5: "5",
  exec: "E",
  multigen: "MG",
};

/** Short code such as "3NG", or null when the model has no common code. */
export function modelCode(typeKey: string, id: string): string | null {
  const code = modelInfo(id).code;
  const prefix = TYPE_PREFIX[typeKey];
  return code && prefix ? `${prefix}${code}` : null;
}

// Resale `flat_type` values → FLAT_TYPES keys.
const RESALE_TYPES: Readonly<Record<string, string>> = {
  "1 ROOM": "r1",
  "2 ROOM": "r2",
  "3 ROOM": "r3",
  "4 ROOM": "r4",
  "5 ROOM": "r5",
  EXECUTIVE: "exec",
  "MULTI-GENERATION": "multigen",
  "MULTI GENERATION": "multigen",
};

export function resaleTypeKey(flatType: string): string | null {
  return RESALE_TYPES[cleanModel(flatType)] ?? null;
}
