import { SelectionMode, type SelectionState } from "~/features/tickets/types/selection";
import type { TableFilter } from "~/features/tickets/types/table-query";

/**
 * Pure selection logic — the single unit-tested module of the feature.
 *
 * The state is a discriminated union (see `types/selection.ts`): `include` holds an explicit set of
 * picked ids, `all` means "everything matching a filter" minus an `excluded` set. Every operation
 * returns a brand-new state (no mutation) so React state updates stay predictable; every selector is
 * a pure read. Nothing here touches React, the network, or the store — the reducer wrapper at the
 * bottom is the only concession to the `useReducer` call site.
 */

/** The starting point: nothing picked, in explicit-include mode. */
export const EMPTY_SELECTION: SelectionState = {
  ids: new Set(),
  mode: SelectionMode.INCLUDE
};

function withToggled(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

function withAdded(set: ReadonlySet<string>, ids: ReadonlyArray<string>): Set<string> {
  const next = new Set(set);
  for (const id of ids) {
    next.add(id);
  }
  return next;
}

function withRemoved(set: ReadonlySet<string>, ids: ReadonlyArray<string>): Set<string> {
  const next = new Set(set);
  for (const id of ids) {
    next.delete(id);
  }
  return next;
}

function assigneeIdsEqual(a: Array<string> | null, b: Array<string> | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  if (a.length !== b.length) {
    return false;
  }
  const bSet = new Set(b);
  return a.every((id) => bSet.has(id));
}

function filtersEqual(a: TableFilter, b: TableFilter): boolean {
  return a.status === b.status && a.q === b.q && assigneeIdsEqual(a.assigneeIds, b.assigneeIds);
}

// --- Operations -----------------------------------------------------------------------------------

/** Toggle a single row. In `include` it flips membership; in `all` it flips the `excluded` marker. */
export function toggleRow(state: SelectionState, id: string): SelectionState {
  if (state.mode === SelectionMode.INCLUDE) {
    return { ids: withToggled(state.ids, id), mode: SelectionMode.INCLUDE };
  }
  return { excluded: withToggled(state.excluded, id), filter: state.filter, mode: SelectionMode.ALL };
}

/** Select every visible row of the current page (the header checkbox). */
export function selectCurrentPage(state: SelectionState, pageIds: ReadonlyArray<string>): SelectionState {
  if (state.mode === SelectionMode.INCLUDE) {
    return { ids: withAdded(state.ids, pageIds), mode: SelectionMode.INCLUDE };
  }
  // In `all` everything is already selected — "selecting" the page just clears any exclusions on it.
  return { excluded: withRemoved(state.excluded, pageIds), filter: state.filter, mode: SelectionMode.ALL };
}

/** Deselect every visible row of the current page. */
export function deselectCurrentPage(state: SelectionState, pageIds: ReadonlyArray<string>): SelectionState {
  if (state.mode === SelectionMode.INCLUDE) {
    return { ids: withRemoved(state.ids, pageIds), mode: SelectionMode.INCLUDE };
  }
  return { excluded: withAdded(state.excluded, pageIds), filter: state.filter, mode: SelectionMode.ALL };
}

/**
 * Escalate to "everything matching the current filter". This is always a deliberate second click,
 * so it discards whatever was picked before and binds the selection to `filter`.
 */
export function selectAllMatching(filter: TableFilter): SelectionState {
  return { excluded: new Set(), filter, mode: SelectionMode.ALL };
}

/** Wipe the selection back to the empty include state. */
export function clearSelection(): SelectionState {
  return EMPTY_SELECTION;
}

/**
 * Drops ids that a bulk action already succeeded on, so a partial failure leaves only the failed ids
 * selected (ready for a "retry" re-submit). In `include` mode that means removing them from `ids`; in
 * `all` mode it means adding them to `excluded` so they don't get re-processed by a follow-up action.
 */
export function removeIds(state: SelectionState, ids: ReadonlyArray<string>): SelectionState {
  if (state.mode === SelectionMode.INCLUDE) {
    return { ids: withRemoved(state.ids, ids), mode: SelectionMode.INCLUDE };
  }
  return { excluded: withAdded(state.excluded, ids), filter: state.filter, mode: SelectionMode.ALL };
}

/**
 * React to a filter change. An `all` selection is scoped to the filter it was created with, so a
 * different filter resets it (the caller surfaces a toast). An `include` selection is the user's
 * explicit intent and survives untouched — some ids may now fall outside the filter, which the
 * toolbar reports via `countOutsideFilter`.
 */
export function applyFilterChange(state: SelectionState, nextFilter: TableFilter): SelectionState {
  if (state.mode === SelectionMode.ALL && !filtersEqual(state.filter, nextFilter)) {
    return EMPTY_SELECTION;
  }
  return state;
}

// --- Selectors ------------------------------------------------------------------------------------

/** Is this row currently selected? */
export function isSelected(state: SelectionState, id: string): boolean {
  return state.mode === SelectionMode.INCLUDE ? state.ids.has(id) : !state.excluded.has(id);
}

/**
 * Total selected count. `include` is just the set size; `all` needs the server's matching total
 * because the client never holds every id — it's `total − excluded`.
 */
export function selectionCount(state: SelectionState, totalMatching: number): number {
  if (state.mode === SelectionMode.INCLUDE) {
    return state.ids.size;
  }
  return Math.max(0, totalMatching - state.excluded.size);
}

/** Is there an active selection at all (drives whether the bulk toolbar shows)? */
export function hasSelection(state: SelectionState): boolean {
  return state.mode === SelectionMode.ALL || state.ids.size > 0;
}

/**
 * How many picked ids no longer match the current filter — the "(3 outside current filter)" hint.
 * Only meaningful in `include`; an `all` selection resets on filter change so it is never stale.
 * `matchingIds` is the set of ids that match the active query.
 */
export function countOutsideFilter(state: SelectionState, matchingIds: ReadonlySet<string>): number {
  if (state.mode !== SelectionMode.INCLUDE) {
    return 0;
  }
  let outside = 0;
  for (const id of state.ids) {
    if (!matchingIds.has(id)) {
      outside += 1;
    }
  }
  return outside;
}

export const PageCheckboxState = {
  CHECKED: "checked",
  INDETERMINATE: "indeterminate",
  UNCHECKED: "unchecked"
} as const;

export type PageCheckboxState = (typeof PageCheckboxState)[keyof typeof PageCheckboxState];

/** Tri-state of the header checkbox, computed against the rows currently on screen. */
export function pageCheckboxState(state: SelectionState, pageIds: ReadonlyArray<string>): PageCheckboxState {
  if (pageIds.length === 0) {
    return PageCheckboxState.UNCHECKED;
  }
  let selected = 0;
  for (const id of pageIds) {
    if (isSelected(state, id)) {
      selected += 1;
    }
  }
  if (selected === 0) {
    return PageCheckboxState.UNCHECKED;
  }
  return selected === pageIds.length ? PageCheckboxState.CHECKED : PageCheckboxState.INDETERMINATE;
}

// --- Reducer wrapper ------------------------------------------------------------------------------

export type SelectionAction =
  | { type: "TOGGLE_ROW"; id: string }
  | { type: "SELECT_PAGE"; pageIds: ReadonlyArray<string> }
  | { type: "DESELECT_PAGE"; pageIds: ReadonlyArray<string> }
  | { type: "SELECT_ALL_MATCHING"; filter: TableFilter }
  | { type: "FILTER_CHANGED"; filter: TableFilter }
  | { type: "REMOVE_IDS"; ids: ReadonlyArray<string> }
  | { type: "CLEAR" };

/** Thin dispatcher over the pure operations, for the `useReducer` store in `hooks/use-selection.ts`. */
export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "TOGGLE_ROW":
      return toggleRow(state, action.id);
    case "SELECT_PAGE":
      return selectCurrentPage(state, action.pageIds);
    case "DESELECT_PAGE":
      return deselectCurrentPage(state, action.pageIds);
    case "SELECT_ALL_MATCHING":
      return selectAllMatching(action.filter);
    case "FILTER_CHANGED":
      return applyFilterChange(state, action.filter);
    case "REMOVE_IDS":
      return removeIds(state, action.ids);
    case "CLEAR":
      return clearSelection();
    default:
      return state;
  }
}
