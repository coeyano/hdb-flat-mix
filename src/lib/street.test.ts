import { describe, expect, it } from "vitest";
import { blockKey, normaliseBlock, normalisePostal, normaliseStreet, STREET_EXPANSIONS } from "./street";

describe("normaliseStreet", () => {
  it.each([
    ["MARSILING ROAD", "MARSILING RD"],
    ["Woodlands Avenue 1", "WOODLANDS AVE 1"],
    ["MARSILING DRIVE", "MARSILING DR"],
    ["MARSILING CRESCENT", "MARSILING CRES"],
    ["SERANGOON NORTH AVENUE 4", "SERANGOON NTH AVE 4"],
    ["BEDOK SOUTH AVENUE 1", "BEDOK STH AVE 1"],
    ["SENGKANG CENTRAL", "SENGKANG CTRL"],
    ["BUKIT BATOK WEST AVENUE 4", "BT BATOK WEST AVE 4"],
    ["JALAN RAJAH", "JLN RAJAH"],
    ["LORONG 1 TOA PAYOH", "LOR 1 TOA PAYOH"],
    ["KAMPONG KAYU ROAD", "KG KAYU RD"],
    ["TANJONG PAGAR PLAZA", "TG PAGAR PLAZA"],
    ["COMMONWEALTH CRESCENT", "C'WEALTH CRES"],
    ["SAINT GEORGE'S ROAD", "ST. GEORGE'S RD"],
    ["UPPER BOON KENG ROAD", "UPP BOON KENG RD"],
    ["TELOK BLANGAH HEIGHTS", "TELOK BLANGAH HTS"],
    ["PANDAN GARDENS", "PANDAN GDNS"],
    ["TENGAH GARDEN AVENUE", "TENGAH GDN AVE"],
    ["PASIR RIS STREET 11", "PASIR RIS ST 11"],
    ["WOODLANDS INDUSTRIAL PARK E3", "WOODLANDS IND PK E3"],
  ])("%s → %s", (input, expected) => {
    expect(normaliseStreet(input)).toBe(expected);
  });

  it("leaves already-abbreviated names and EAST/WEST unchanged", () => {
    expect(normaliseStreet("MARSILING RD")).toBe("MARSILING RD");
    expect(normaliseStreet("JURONG EAST ST 21")).toBe("JURONG EAST ST 21");
  });

  it("collapses whitespace and case", () => {
    expect(normaliseStreet("  marsiling   road ")).toBe("MARSILING RD");
  });
});

describe("STREET_EXPANSIONS", () => {
  it("maps abbreviations back to full words, preferring STREET for ST", () => {
    expect(STREET_EXPANSIONS.RD).toBe("ROAD");
    expect(STREET_EXPANSIONS.ST).toBe("STREET");
    expect(STREET_EXPANSIONS["ST."]).toBe("SAINT");
  });
});

describe("block and postal helpers", () => {
  it("normalises block numbers", () => {
    expect(normaliseBlock("012a")).toBe("12A");
    expect(normaliseBlock(" 134 B ")).toBe("134B");
    expect(normaliseBlock(0)).toBe("0");
  });

  it("builds join keys from any spelling", () => {
    expect(blockKey("1", "Marsiling Drive")).toBe("1|MARSILING DR");
  });

  it("pads postal codes with leading zeros", () => {
    expect(normalisePostal(51001)).toBe("051001");
    expect(normalisePostal("730001")).toBe("730001");
  });
});
