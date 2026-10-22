// Checks that an attached file really is a PDF or image by its first bytes,
// not just its name or the type the browser reports.

export type PlanKind = "pdf" | "image";

export const MAX_PLAN_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_TYPES = "application/pdf,image/png,image/jpeg,image/webp,image/gif";

const startsWith = (bytes: Uint8Array, sig: readonly number[], offset = 0) =>
  sig.every((b, i) => bytes[offset + i] === b);

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** The real MIME type of a file, from its first bytes; null if it isn't a supported plan format. */
export function detectMime(bytes: Uint8Array): string | null {
  if (startsWith(bytes, ascii("%PDF-"))) return "application/pdf";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, ascii("GIF8"))) return "image/gif";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "image/webp";
  return null;
}

export function detectKind(bytes: Uint8Array): PlanKind | null {
  const mime = detectMime(bytes);
  return mime ? (mime === "application/pdf" ? "pdf" : "image") : null;
}

// `file` is a copy typed by its contents, never by its name, so a disguised web page
// can't later open as HTML in this site when "Open full size" is used.
export type PlanFileCheck = { ok: true; kind: PlanKind; file: Blob } | { ok: false; message: string };

export async function checkPlanFile(file: Blob & { name?: string }): Promise<PlanFileCheck> {
  if (file.size === 0) return { ok: false, message: "That file is empty." };
  if (file.size > MAX_PLAN_BYTES) {
    return { ok: false, message: `That file is ${(file.size / 1024 / 1024).toFixed(0)} MB; the limit is 25 MB.` };
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mime = detectMime(head);
  return mime
    ? { ok: true, kind: mime === "application/pdf" ? "pdf" : "image", file: new Blob([file], { type: mime }) }
    : { ok: false, message: "Only PDF, PNG, JPEG, WebP or GIF floor plans can be attached." };
}
