import { useId, useRef, useState } from "react";
import { ACCEPTED_TYPES, checkPlanFile } from "../../lib/plans/fileKind";
import { addPlan } from "../../lib/plans/planStore";

interface Props {
  blockId: string;
  slot: string; // "type|model"
  label: string; // what the plan is for, e.g. "3NG New Generation"
}

/** "Attach plan" button: checks the file, then saves it in this browser only. */
export function AttachPlan({ blockId, slot, label }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const check = await checkPlanFile(file);
      if (!check.ok) {
        setError(check.message);
        return;
      }
      await addPlan({ blockId, slot, name: file.name || "Floor plan", kind: check.kind, size: file.size, file: check.file });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        aria-label={`Floor plan file for ${label}`}
        accept={ACCEPTED_TYPES}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        aria-disabled={busy}
        onClick={() => !busy && input.current?.click()}
        className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-accent hover:text-accent-strong aria-disabled:opacity-50"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 4v12M4 10h12" strokeLinecap="round" />
        </svg>
        {busy ? "Saving…" : "Attach plan"}
        <span className="sr-only"> for {label}</span>
      </button>
      <span aria-live="polite" className="sr-only">
        {saved ? `Plan for ${label} saved on this device.` : ""}
      </span>
      {error && (
        <p role="alert" className="basis-full text-xs text-ink-2">
          {error}
        </p>
      )}
    </>
  );
}
