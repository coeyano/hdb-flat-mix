import { useCallback, useEffect, useState } from "react";
import type { ColourBy } from "./mapColours";

const KEY = "hdb-flat-mix:colour-by";
const EVENT = "hdb-colour-by";

const read = (): ColourBy => {
  try {
    return localStorage.getItem(KEY) === "year" ? "year" : "type";
  } catch {
    return "type";
  }
};

/** The map colouring choice, remembered in this browser and shared by every map on the page. */
export function useColourBy(): [ColourBy, (by: ColourBy) => void] {
  const [colourBy, setState] = useState<ColourBy>(read);

  useEffect(() => {
    const sync = (e: Event) => setState((e as CustomEvent<ColourBy>).detail);
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const set = useCallback((by: ColourBy) => {
    try {
      localStorage.setItem(KEY, by);
    } catch {
      // the choice just won't be remembered
    }
    window.dispatchEvent(new CustomEvent<ColourBy>(EVENT, { detail: by }));
  }, []);

  return [colourBy, set];
}
