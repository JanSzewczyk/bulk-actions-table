"use client";

import * as React from "react";
import { SelectionMode, type SelectionState } from "~/features/tickets/types/selection";
import type { TableFilter } from "~/features/tickets/types/table-query";
import {
  EMPTY_SELECTION,
  filtersEqual,
  type SelectionAction,
  selectionReducer
} from "~/features/tickets/utils/selection";

/**
 * Client-side selection store. Kept deliberately separate from the table data (which lives in the
 * URL and is re-fetched by RSC): the selection is the user's *intent* and must survive a
 * `router.refresh()` after a bulk action. A `useReducer` over the pure reducer in `utils/selection.ts`
 * is enough — no external state library needed — and the reducer stays independently unit-tested.
 */

type SelectionContextValue = {
  selection: SelectionState;
  dispatch: React.Dispatch<SelectionAction>;
};

const SelectionContext = React.createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, dispatch] = React.useReducer(selectionReducer, EMPTY_SELECTION);

  return <SelectionContext.Provider value={{ dispatch, selection }}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionContextValue {
  const context = React.useContext(SelectionContext);
  if (context === null) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}

/**
 * Resets an `all` selection when `filter` changes — it's scoped to the filter it was made under,
 * so a different filter invalidates it. An `include` selection is left untouched by the reducer (some
 * of its ids may now fall outside the filter; the toolbar reports that via `useOutsideFilterCount`).
 * `onReset` is only called when an active `all` selection is actually cleared, so the caller can
 * surface a toast without this hook knowing anything about UI.
 */
export function useSelectionFilterSync(filter: TableFilter, onReset?: () => void): void {
  const { selection, dispatch } = useSelection();
  const previousFilterRef = React.useRef(filter);

  React.useEffect(() => {
    const previous = previousFilterRef.current;
    if (filtersEqual(previous, filter)) {
      return;
    }
    if (selection.mode === SelectionMode.ALL) {
      onReset?.();
    }
    dispatch({ filter, type: "FILTER_CHANGED" });
    previousFilterRef.current = filter;
  }, [filter, selection.mode, dispatch, onReset]);
}
