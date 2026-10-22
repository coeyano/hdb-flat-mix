import { useEffect, useRef, useState } from "react";

const MAX_PAGES = 6;

interface Props {
  planId: string; // redraw only when the plan itself changes, not when its Blob is re-read
  file: Blob;
  title: string;
}

/** Draws a PDF's pages onto canvases. pdf.js is loaded only when a PDF is first shown. */
export function PdfPages({ planId, file, title }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const fileRef = useRef(file);
  fileRef.current = file;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [extraPages, setExtraPages] = useState(0);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let cancelled = false;
    let destroy: (() => void) | null = null;
    host.replaceChildren();
    setStatus("loading");

    const draw = async () => {
      const [pdfjs, worker, bytes] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        fileRef.current.arrayBuffer(),
      ]);
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
      destroy = () => void task.destroy();
      const doc = await task.promise;
      if (cancelled) return;

      const pages = Math.min(doc.numPages, MAX_PAGES);
      const cssWidth = host.clientWidth || 600;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvases: HTMLCanvasElement[] = [];
      for (let n = 1; n <= pages; n++) {
        const page = await doc.getPage(n);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (cssWidth / base.width) * ratio });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.className = "block w-full h-auto rounded-md border border-line bg-white";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `${title}, page ${n}`);
        await page.render({ canvas, viewport }).promise;
        page.cleanup();
        if (cancelled) return;
        canvases.push(canvas);
      }
      host.replaceChildren(...canvases);
      setExtraPages(Math.max(0, doc.numPages - pages));
      setStatus("ready");
    };

    draw().catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [planId, title]);

  return (
    <div>
      {status === "loading" && <p className="py-6 text-center text-xs text-muted">Drawing the plan…</p>}
      {status === "error" && (
        <p className="py-3 text-xs text-ink-2">This PDF couldn’t be drawn here. Use “Open full size” to view it.</p>
      )}
      <div ref={container} className="space-y-2" />
      {extraPages > 0 && <p className="mt-2 text-xs text-muted">{extraPages} more page(s): use “Open full size”.</p>}
    </div>
  );
}
