"use client";

import * as React from "react";
import { EMPTY_SELECTION, type SelectionAction, selectionReducer } from "~/features/tickets/lib/selection";
import type { SelectionState } from "~/features/tickets/types/selection";

/**
 * Client-side selection store. Kept deliberately separate from the table data (which lives in the
 * URL and is re-fetched by RSC): the selection is the user's *intent* and must survive a
 * `router.refresh()` after a bulk action. A `useReducer` over the pure reducer in `lib/selection.ts`
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
