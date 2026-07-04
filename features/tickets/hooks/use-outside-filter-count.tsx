"use client";

import * as React from "react";
import type { SelectionState } from "~/features/tickets/types/selection";
import { SelectionMode } from "~/features/tickets/types/selection";
import type { TableFilter } from "~/features/tickets/types/table-query";
import type { ActionResponse } from "~/lib/action-types";

type UseOutsideFilterCountOptions = {
  selection: SelectionState;
  filter: TableFilter;
  onOutsideFilterCountAction(ids: Array<string>, filter: TableFilter): ActionResponse<number>;
};

const OUTSIDE_FILTER_COUNT_DEBOUNCE_MS = 300;

/**
 * "N outside the current filter" — only meaningful for an `include` selection (an `all` selection
 * resets on filter change, so it's never stale). Debounced so toggling many rows in quick succession
 * (or a fast filter change) fires one server request instead of one per toggle; cancellable so a
 * stale in-flight response can't overwrite a newer one.
 */
export function useOutsideFilterCount({
  selection,
  filter,
  onOutsideFilterCountAction
}: UseOutsideFilterCountOptions): number {
  const [outsideFilterCount, setOutsideFilterCount] = React.useState(0);

  React.useEffect(() => {
    if (selection.mode !== SelectionMode.INCLUDE || selection.ids.size === 0) {
      setOutsideFilterCount(0);
      return;
    }

    let cancelled = false;
    const ids = Array.from(selection.ids);
    const timeoutId = setTimeout(() => {
      onOutsideFilterCountAction(ids, filter)
        .then((result) => {
          if (!cancelled && result.success) {
            setOutsideFilterCount(result.data);
          }
        })
        .catch(() => undefined);
    }, OUTSIDE_FILTER_COUNT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [selection, filter, onOutsideFilterCountAction]);

  return outsideFilterCount;
}
