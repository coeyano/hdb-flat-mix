import { useEffect, useState } from "react";
import { type Block, type BlocksFile, decodeFile } from "./blocks";
import { type BlockIndex, buildIndex } from "./search";

export interface SourceMeta {
  id: string;
  name: string;
  lastUpdatedAt: string;
  pageUrl: string;
}

export interface DataMeta {
  generatedAt: string;
  sources: SourceMeta[];
  residentialBlocks: number;
  locatedBlocks: number;
  unmatched: string[];
}

export type DataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; blocks: Block[]; index: BlockIndex; meta: DataMeta };

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`Could not load ${file} (HTTP ${res.status}).`);
  return (await res.json()) as T;
}

export function useData(): DataState {
  const [state, setState] = useState<DataState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getJson<BlocksFile>("blocks.json"), getJson<DataMeta>("meta.json")])
      .then(([file, meta]) => {
        const blocks = decodeFile(file);
        if (!cancelled) setState({ status: "ready", blocks, index: buildIndex(blocks), meta });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
