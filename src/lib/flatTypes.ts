// Flat types in display order, with the HDB CSV column each one comes from.
// `group` drives colour: flat sizes share one ordinal blue scale, rentals are grey.

export type MixGroup = "small" | "r3" | "r4" | "r5" | "large" | "rental";

export interface FlatType {
  key: string;
  label: string;
  short: string;
  column: string;
  group: MixGroup;
}

export const FLAT_TYPES: readonly FlatType[] = [
  { key: "r1", label: "1-room", short: "1R", column: "1room_sold", group: "small" },
  { key: "r2", label: "2-room", short: "2R", column: "2room_sold", group: "small" },
  { key: "r3", label: "3-room", short: "3R", column: "3room_sold", group: "r3" },
  { key: "r4", label: "4-room", short: "4R", column: "4room_sold", group: "r4" },
  { key: "r5", label: "5-room", short: "5R", column: "5room_sold", group: "r5" },
  { key: "exec", label: "Executive", short: "Exec", column: "exec_sold", group: "large" },
  { key: "multigen", label: "Multi-generation", short: "MG", column: "multigen_sold", group: "large" },
  { key: "studio", label: "Studio", short: "Studio", column: "studio_apartment_sold", group: "small" },
  { key: "rent1", label: "1-room rental", short: "1R rent", column: "1room_rental", group: "rental" },
  { key: "rent2", label: "2-room rental", short: "2R rent", column: "2room_rental", group: "rental" },
  { key: "rent3", label: "3-room rental", short: "3R rent", column: "3room_rental", group: "rental" },
  { key: "rentOther", label: "Other rental", short: "Oth rent", column: "other_room_rental", group: "rental" },
];

export interface MixGroupInfo {
  key: MixGroup;
  label: string;
  color: string;
}

// Ordinal blue ramp validated for light→dark step gaps and 2:1 light-end contrast.
export const MIX_GROUPS: readonly MixGroupInfo[] = [
  { key: "small", label: "Studio, 1–2 room", color: "#86b6ef" },
  { key: "r3", label: "3-room", color: "#5598e7" },
  { key: "r4", label: "4-room", color: "#2a78d6" },
  { key: "r5", label: "5-room", color: "#1c5cab" },
  { key: "large", label: "Executive, Multi-gen", color: "#0d366b" },
  { key: "rental", label: "Rental", color: "#a8a69e" },
];

export const GROUP_BY_KEY: Readonly<Record<MixGroup, MixGroupInfo>> = Object.fromEntries(
  MIX_GROUPS.map((g) => [g.key, g]),
) as Record<MixGroup, MixGroupInfo>;

// bldg_contract_town codes in the HDB Property Information dataset.
export const TOWNS: Readonly<Record<string, string>> = {
  AMK: "Ang Mo Kio",
  BB: "Bukit Batok",
  BD: "Bedok",
  BH: "Bishan",
  BM: "Bukit Merah",
  BP: "Bukit Panjang",
  BT: "Bukit Timah",
  CCK: "Choa Chu Kang",
  CL: "Clementi",
  CT: "Central Area",
  GL: "Geylang",
  HG: "Hougang",
  JE: "Jurong East",
  JW: "Jurong West",
  KWN: "Kallang/Whampoa",
  MP: "Marine Parade",
  PG: "Punggol",
  PRC: "Pasir Ris",
  QT: "Queenstown",
  SB: "Sembawang",
  SGN: "Serangoon",
  SK: "Sengkang",
  TAP: "Tampines",
  TG: "Tengah",
  TP: "Toa Payoh",
  WL: "Woodlands",
  YS: "Yishun",
};

export function townName(code: string): string {
  return TOWNS[code] ?? code;
}
