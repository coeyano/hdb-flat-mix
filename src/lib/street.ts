// OneMap spells street words out ("MARSILING ROAD"); HDB abbreviates them ("MARSILING RD").
// HDB keeps EAST/WEST in full, so those are deliberately absent.
export const STREET_ABBREVIATIONS: Readonly<Record<string, string>> = {
  AVENUE: "AVE",
  ROAD: "RD",
  STREET: "ST",
  DRIVE: "DR",
  CRESCENT: "CRES",
  NORTH: "NTH",
  SOUTH: "STH",
  CENTRAL: "CTRL",
  CLOSE: "CL",
  PLACE: "PL",
  PARK: "PK",
  GARDEN: "GDN",
  GARDENS: "GDNS",
  HEIGHTS: "HTS",
  TERRACE: "TER",
  SQUARE: "SQ",
  UPPER: "UPP",
  BUKIT: "BT",
  JALAN: "JLN",
  LORONG: "LOR",
  KAMPONG: "KG",
  TANJONG: "TG",
  INDUSTRIAL: "IND",
  MARKET: "MKT",
  COMMONWEALTH: "C'WEALTH",
  SAINT: "ST.",
};

// Reverse map, so a search for "road" also finds "RD". "ST" is ambiguous (STREET/SAINT);
// the first entry wins, which is STREET.
export const STREET_EXPANSIONS: Readonly<Record<string, string>> = Object.entries(
  STREET_ABBREVIATIONS,
).reduce<Record<string, string>>((acc, [full, abbr]) => (abbr in acc ? acc : { ...acc, [abbr]: full }), {});

export function cleanText(text: string): string {
  return String(text).toUpperCase().replace(/\s+/g, " ").trim();
}

/** Convert a street name in any spelling to HDB's abbreviated form. */
export function normaliseStreet(name: string): string {
  return cleanText(name)
    .split(" ")
    .filter(Boolean)
    .map((word) => STREET_ABBREVIATIONS[word] ?? word)
    .join(" ");
}

/** Block numbers: uppercase, no spaces, no leading zeros ("012a" → "12A"). */
export function normaliseBlock(blk: string | number): string {
  return cleanText(String(blk)).replace(/\s/g, "").replace(/^0+(?=\d)/, "");
}

export function blockKey(blk: string | number, street: string): string {
  return `${normaliseBlock(blk)}|${normaliseStreet(street)}`;
}

export function normalisePostal(postal: string | number): string {
  return String(postal).trim().padStart(6, "0");
}
