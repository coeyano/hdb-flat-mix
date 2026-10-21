/** "MARSILING DR" → "Marsiling Dr", "C'WEALTH CRES" → "C'wealth Cres". */
export function titleCase(text: string): string {
  return text.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function formatAddress(blk: string, street: string): string {
  return `Blk ${blk} ${titleCase(street)}`;
}

const numberFormat = new Intl.NumberFormat("en-SG");
export const fmt = (n: number) => numberFormat.format(n);

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
}
