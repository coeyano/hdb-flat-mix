import { useCallback, useEffect, useState } from "react";
import { allPlans, onPlansChanged, plansForBlock, type PlanSummary, type SavedPlan } from "./planStore";

interface PlansState<T> {
  plans: T[];
  error: string | null;
}

function usePlanQuery<T>(load: () => Promise<T[]>): PlansState<T> {
  const [state, setState] = useState<PlansState<T>>({ plans: [], error: null });

  const refresh = useCallback(() => {
    let cancelled = false;
    load()
      .then((plans) => !cancelled && setState({ plans, error: null }))
      .catch((err: unknown) => !cancelled && setState({ plans: [], error: err instanceof Error ? err.message : String(err) }));
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    let cancel = refresh();
    const unsubscribe = onPlansChanged(() => {
      cancel();
      cancel = refresh();
    });
    return () => {
      cancel();
      unsubscribe();
    };
  }, [refresh]);

  return state;
}

/** Plans saved on this device for one block, kept up to date as plans are added or removed. */
export function useBlockPlans(blockId: string): PlansState<SavedPlan> {
  const load = useCallback(() => plansForBlock(blockId), [blockId]);
  return usePlanQuery(load);
}

/** Every plan saved on this device (without file contents). */
export function useAllPlans(): PlansState<PlanSummary> {
  return usePlanQuery(allPlans);
}
