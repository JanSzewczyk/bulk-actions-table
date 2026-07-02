import type { TableFilter } from "./table-query";

/**
 * Hybrid selection model. Two mutually exclusive semantics:
 *
 * - `include` — an explicit set of ticket ids the user picked (survives paging/sort/filter).
 * - `all` — "everything matching this filter", minus an `excluded` set (escalated via a deliberate
 *   second click). Bound to the filter it was created with; changing the filter resets it.
 *
 * The reducer over this state lives in `lib/selection.ts` and is the single unit-tested module.
 */

export const SelectionMode = {
  ALL: "all",
  INCLUDE: "include"
} as const;

export type SelectionMode = (typeof SelectionMode)[keyof typeof SelectionMode];

export type SelectionState =
  | { mode: typeof SelectionMode.INCLUDE; ids: Set<string> }
  | { mode: typeof SelectionMode.ALL; filter: TableFilter; excluded: Set<string> };
