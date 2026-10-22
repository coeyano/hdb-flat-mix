// Floor plans the user attaches are kept in this browser's IndexedDB only.
// Nothing here talks to a server, so plans never leave the device.
import type { PlanKind } from "./fileKind";

export interface SavedPlan {
  id: string;
  blockId: string; // "blk|street"
  slot: string; // "type|model" (model may be empty when the block has no recorded model)
  name: string;
  kind: PlanKind;
  size: number;
  addedAt: string; // ISO date
  file: Blob;
}

export type PlanSummary = Omit<SavedPlan, "file">;

const DB_NAME = "hdb-flat-mix";
const STORE = "plans";
const CHANGE_EVENT = "hdb-plans-changed";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser can't save files for this site (private browsing may block it)."));
      return;
    }
    let settled = false;
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("blockId", "blockId");
    };
    req.onsuccess = () => {
      const db = req.result;
      if (settled) {
        db.close(); // we already gave up waiting (blocked), so don't leak the connection
        return;
      }
      settled = true;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => {
      settled = true;
      reject(req.error ?? new Error("Could not open the plan store."));
    };
    req.onblocked = () => {
      settled = true;
      reject(new Error("Close other tabs of this app and try again."));
    };
  });
}

const QUOTA_MESSAGE = "This device is out of space for saved plans. Remove some and try again.";

const friendly = (err: DOMException | Error | null | undefined, fallback: string): Error =>
  err?.name === "QuotaExceededError" ? new Error(QUOTA_MESSAGE) : err instanceof Error ? err : new Error(fallback);

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let tx: IDBTransaction;
        let req: IDBRequest<T>;
        try {
          tx = db.transaction(STORE, mode);
          req = work(tx.objectStore(STORE));
        } catch (err) {
          db.close();
          reject(friendly(err as Error, "Plan storage failed."));
          return;
        }
        let result: T;
        req.onsuccess = () => {
          result = req.result;
        };
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        // Errors reach onerror (request) and then onabort (transaction); report once.
        let failed = false;
        const fail = (err: DOMException | null | undefined, fallback: string) => {
          if (failed) return;
          failed = true;
          db.close();
          reject(friendly(err, fallback));
        };
        tx.onerror = () => fail(req.error ?? tx.error, "Plan storage failed.");
        tx.onabort = () => fail(tx.error ?? req.error, "Plan storage was interrupted.");
      }),
  );
}

const notify = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
};

export function onPlansChanged(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export async function addPlan(input: Omit<SavedPlan, "id" | "addedAt">): Promise<SavedPlan> {
  const plan: SavedPlan = { ...input, id: newId(), addedAt: new Date().toISOString() };
  await run("readwrite", (s) => s.add(plan));
  // Ask the browser not to clear saved plans when space runs low (best effort; may be refused).
  void navigator.storage?.persist?.().catch(() => false);
  notify();
  return plan;
}

export async function removePlan(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
  notify();
}

export function getPlan(id: string): Promise<SavedPlan | undefined> {
  return run("readonly", (s) => s.get(id) as IDBRequest<SavedPlan | undefined>);
}

const byDate = (a: { addedAt: string }, b: { addedAt: string }) => a.addedAt.localeCompare(b.addedAt);
const summarise = ({ file: _file, ...rest }: SavedPlan): PlanSummary => rest;

export async function plansForBlock(blockId: string): Promise<SavedPlan[]> {
  const plans = await run("readonly", (s) => s.index("blockId").getAll(blockId) as IDBRequest<SavedPlan[]>);
  return plans.sort(byDate);
}

/** Every saved plan, without file contents, newest first. */
export async function allPlans(): Promise<PlanSummary[]> {
  const plans = await run("readonly", (s) => s.getAll() as IDBRequest<SavedPlan[]>);
  return plans.map(summarise).sort((a, b) => byDate(b, a));
}
