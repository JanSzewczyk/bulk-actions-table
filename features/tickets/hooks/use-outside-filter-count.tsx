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

/**
 * "N outside the current filter" — only meaningful for an `include` selection (an `all` selection
 * resets on filter change, so it's never stale). Cancellable so a fast filter change can't let a
 * stale response overwrite a newer one.
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
    onOutsideFilterCountAction(ids, filter)
      .then((result) => {
        if (!cancelled && result.success) {
          setOutsideFilterCount(result.data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selection, filter, onOutsideFilterCountAction]);

  return outsideFilterCount;
}
