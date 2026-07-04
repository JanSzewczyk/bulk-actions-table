import { describe, expect, test } from "vitest";
import { SelectionMode, type SelectionState } from "~/features/tickets/types/selection";
import type { TableFilter } from "~/features/tickets/types/table-query";
import { TicketStatus } from "~/features/tickets/types/ticket";
import {
  applyFilterChange,
  clearSelection,
  countOutsideFilter,
  deselectCurrentPage,
  EMPTY_SELECTION,
  filtersEqual,
  hasSelection,
  isExcludedApproachingTotal,
  isSelected,
  PageCheckboxState,
  pageCheckboxState,
  removeIds,
  selectAllMatching,
  selectCurrentPage,
  selectionCount,
  selectionReducer,
  toggleRow
} from "./selection";

const NO_FILTER: TableFilter = { assigneeIds: null, q: null, status: null };
const OPEN_FILTER: TableFilter = { assigneeIds: null, q: null, status: TicketStatus.OPEN };

function include(...ids: Array<string>): Extract<SelectionState, { mode: typeof SelectionMode.INCLUDE }> {
  return { ids: new Set(ids), mode: SelectionMode.INCLUDE };
}

function all(
  filter: TableFilter,
  ...excluded: Array<string>
): Extract<SelectionState, { mode: typeof SelectionMode.ALL }> {
  return { excluded: new Set(excluded), filter, mode: SelectionMode.ALL };
}

describe("toggleRow", () => {
  test("adds an id to an empty include selection", () => {
    const next = toggleRow(EMPTY_SELECTION, "t1");
    expect(isSelected(next, "t1")).toBe(true);
  });

  test("removes an already-picked id in include mode", () => {
    const next = toggleRow(include("t1", "t2"), "t1");
    expect(isSelected(next, "t1")).toBe(false);
    expect(isSelected(next, "t2")).toBe(true);
  });

  test("in all mode, toggling a selected row excludes it", () => {
    const next = toggleRow(all(NO_FILTER), "t1");
    expect(isSelected(next, "t1")).toBe(false);
  });

  test("in all mode, toggling an excluded row re-selects it", () => {
    const next = toggleRow(all(NO_FILTER, "t1"), "t1");
    expect(isSelected(next, "t1")).toBe(true);
  });

  test("does not mutate the input state", () => {
    const state = include("t1");
    toggleRow(state, "t2");
    expect(state.ids.has("t2")).toBe(false);
  });
});

describe("selectCurrentPage / deselectCurrentPage", () => {
  test("selecting the page adds every visible id in include mode", () => {
    const next = selectCurrentPage(EMPTY_SELECTION, ["t1", "t2", "t3"]);
    expect(selectionCount(next, 0)).toBe(3);
  });

  test("selecting the page clears matching exclusions in all mode", () => {
    const next = selectCurrentPage(all(NO_FILTER, "t1", "t2"), ["t1", "t2"]);
    expect(isSelected(next, "t1")).toBe(true);
    expect(isSelected(next, "t2")).toBe(true);
  });

  test("deselecting the page removes visible ids in include mode", () => {
    const next = deselectCurrentPage(include("t1", "t2", "t9"), ["t1", "t2"]);
    expect(isSelected(next, "t1")).toBe(false);
    expect(isSelected(next, "t9")).toBe(true);
  });

  test("deselecting the page excludes visible ids in all mode", () => {
    const next = deselectCurrentPage(all(NO_FILTER), ["t1", "t2"]);
    expect(isSelected(next, "t1")).toBe(false);
    expect(isSelected(next, "t3")).toBe(true);
  });
});

describe("selectAllMatching", () => {
  test("escalates to all mode bound to the current filter with no exclusions", () => {
    const next = selectAllMatching(OPEN_FILTER);
    expect(next.mode).toBe(SelectionMode.ALL);
    expect(selectionCount(next, 8214)).toBe(8214);
  });

  test("discards a prior include selection", () => {
    const next = selectAllMatching(OPEN_FILTER);
    // Everything matches now, regardless of what was picked before.
    expect(isSelected(next, "whatever")).toBe(true);
  });
});

describe("clearSelection", () => {
  test("returns to the empty include state", () => {
    const next = clearSelection();
    expect(next.mode).toBe(SelectionMode.INCLUDE);
    expect(hasSelection(next)).toBe(false);
  });
});

describe("applyFilterChange", () => {
  test("resets an all selection when the filter changes", () => {
    const next = applyFilterChange(all(NO_FILTER, "t1"), OPEN_FILTER);
    expect(next).toBe(EMPTY_SELECTION);
  });

  test("keeps an all selection when the filter is unchanged", () => {
    const state = all(OPEN_FILTER, "t1");
    expect(applyFilterChange(state, OPEN_FILTER)).toBe(state);
  });

  test("leaves an include selection untouched across filter changes", () => {
    const state = include("t1", "t2");
    expect(applyFilterChange(state, OPEN_FILTER)).toBe(state);
  });

  test("resets an all selection when only the assignee filter changes", () => {
    const withAssignee: TableFilter = { assigneeIds: ["u1"], q: null, status: null };
    const next = applyFilterChange(all(NO_FILTER, "t1"), withAssignee);
    expect(next).toBe(EMPTY_SELECTION);
  });

  test("keeps an all selection when the assignee filter is the same set in a different order", () => {
    const filterA: TableFilter = { assigneeIds: ["u1", "u2"], q: null, status: null };
    const filterB: TableFilter = { assigneeIds: ["u2", "u1"], q: null, status: null };
    const state = all(filterA, "t1");
    expect(applyFilterChange(state, filterB)).toBe(state);
  });

  test("resets an all selection when assignee ids differ despite an equal-length array with a duplicate", () => {
    // Regression: a naive `every(id => b.includes(id))` check treats ["u1","u1"] as equal to
    // ["u1","u2"] (same length, every element of a found in b) even though the sets differ.
    const filterA: TableFilter = { assigneeIds: ["u1", "u1"], q: null, status: null };
    const filterB: TableFilter = { assigneeIds: ["u1", "u2"], q: null, status: null };
    const next = applyFilterChange(all(filterA, "t1"), filterB);
    expect(next).toBe(EMPTY_SELECTION);
  });
});

describe("filtersEqual", () => {
  test("is the single comparison both the reducer and the filter-sync hook rely on", () => {
    const filterA: TableFilter = { assigneeIds: ["u1", "u2"], q: null, status: null };
    const filterB: TableFilter = { assigneeIds: ["u2", "u1"], q: null, status: null };
    expect(filtersEqual(filterA, filterB)).toBe(true);
  });

  test("treats a duplicate-id array as different from a distinct-id array of the same length", () => {
    const filterA: TableFilter = { assigneeIds: ["u1", "u1"], q: null, status: null };
    const filterB: TableFilter = { assigneeIds: ["u1", "u2"], q: null, status: null };
    expect(filtersEqual(filterA, filterB)).toBe(false);
  });
});

describe("selectionCount", () => {
  test("include mode reports the set size", () => {
    expect(selectionCount(include("t1", "t2"), 8214)).toBe(2);
  });

  test("all mode reports total minus excluded", () => {
    expect(selectionCount(all(NO_FILTER, "t1", "t2"), 8214)).toBe(8212);
  });

  test("all mode never reports a negative count", () => {
    expect(selectionCount(all(NO_FILTER, "t1", "t2", "t3"), 2)).toBe(0);
  });
});

describe("countOutsideFilter", () => {
  test("counts picked ids that no longer match the filter", () => {
    const matching = new Set(["t1", "t9"]);
    expect(countOutsideFilter(include("t1", "t2", "t3", "t9"), matching)).toBe(2);
  });

  test("is zero in all mode (an all selection resets on filter change)", () => {
    expect(countOutsideFilter(all(NO_FILTER, "t1"), new Set())).toBe(0);
  });
});

describe("isExcludedApproachingTotal", () => {
  test("is false in include mode regardless of size", () => {
    expect(isExcludedApproachingTotal(include("t1"), 100, 0.9, 50)).toBe(false);
  });

  test("is false when excluded is below the absolute count threshold, even at 100% ratio", () => {
    const state = all(NO_FILTER, ...Array.from({ length: 10 }, (_, i) => `t${i}`));
    expect(isExcludedApproachingTotal(state, 10, 0.9, 50)).toBe(false);
  });

  test("is false when excluded clears the count threshold but not the ratio", () => {
    const state = all(NO_FILTER, ...Array.from({ length: 60 }, (_, i) => `t${i}`));
    expect(isExcludedApproachingTotal(state, 1000, 0.9, 50)).toBe(false);
  });

  test("is true once excluded clears both the count and ratio thresholds", () => {
    const state = all(NO_FILTER, ...Array.from({ length: 95 }, (_, i) => `t${i}`));
    expect(isExcludedApproachingTotal(state, 100, 0.9, 50)).toBe(true);
  });

  test("is false for a zero total", () => {
    expect(isExcludedApproachingTotal(all(NO_FILTER), 0, 0.9, 50)).toBe(false);
  });
});

describe("pageCheckboxState", () => {
  test("unchecked when no visible row is selected", () => {
    expect(pageCheckboxState(EMPTY_SELECTION, ["t1", "t2"])).toBe(PageCheckboxState.UNCHECKED);
  });

  test("checked when every visible row is selected", () => {
    expect(pageCheckboxState(include("t1", "t2"), ["t1", "t2"])).toBe(PageCheckboxState.CHECKED);
  });

  test("indeterminate when only some visible rows are selected", () => {
    expect(pageCheckboxState(include("t1"), ["t1", "t2"])).toBe(PageCheckboxState.INDETERMINATE);
  });

  test("unchecked for an empty page", () => {
    expect(pageCheckboxState(all(NO_FILTER), [])).toBe(PageCheckboxState.UNCHECKED);
  });

  test("reflects exclusions in all mode", () => {
    expect(pageCheckboxState(all(NO_FILTER, "t1"), ["t1", "t2"])).toBe(PageCheckboxState.INDETERMINATE);
  });
});

describe("removeIds", () => {
  test("drops succeeded ids from an include selection, leaving the rest selected", () => {
    const next = removeIds(include("t1", "t2", "t3"), ["t1", "t3"]);
    expect(isSelected(next, "t1")).toBe(false);
    expect(isSelected(next, "t2")).toBe(true);
    expect(isSelected(next, "t3")).toBe(false);
  });

  test("in all mode, adds succeeded ids to excluded instead of touching the filter", () => {
    const next = removeIds(all(NO_FILTER, "t9"), ["t1", "t2"]);
    expect(next.mode).toBe(SelectionMode.ALL);
    expect(isSelected(next, "t1")).toBe(false);
    expect(isSelected(next, "t2")).toBe(false);
    expect(isSelected(next, "t9")).toBe(false);
  });

  test("a partial failure leaves only the failed ids selected, ready for retry", () => {
    // Simulates the outcome handler: succeeded ids are removed, failed ids are untouched.
    const afterOutcome = removeIds(include("t1", "t2", "t3"), ["t1", "t3"]);
    expect(selectionCount(afterOutcome, 0)).toBe(1);
    expect(isSelected(afterOutcome, "t2")).toBe(true);
  });
});

describe("selectionReducer", () => {
  test("TOGGLE_ROW delegates to toggleRow", () => {
    const next = selectionReducer(EMPTY_SELECTION, { id: "t1", type: "TOGGLE_ROW" });
    expect(isSelected(next, "t1")).toBe(true);
  });

  test("SELECT_ALL_MATCHING escalates to all mode", () => {
    const next = selectionReducer(include("t1"), { filter: OPEN_FILTER, type: "SELECT_ALL_MATCHING" });
    expect(next.mode).toBe(SelectionMode.ALL);
  });

  test("FILTER_CHANGED resets an all selection scoped to a different filter", () => {
    const next = selectionReducer(all(NO_FILTER, "t1"), { filter: OPEN_FILTER, type: "FILTER_CHANGED" });
    expect(next).toBe(EMPTY_SELECTION);
  });

  test("CLEAR empties the selection", () => {
    const next = selectionReducer(all(NO_FILTER), { type: "CLEAR" });
    expect(hasSelection(next)).toBe(false);
  });

  test("REMOVE_IDS delegates to removeIds", () => {
    const next = selectionReducer(include("t1", "t2"), { ids: ["t1"], type: "REMOVE_IDS" });
    expect(isSelected(next, "t1")).toBe(false);
    expect(isSelected(next, "t2")).toBe(true);
  });

  test("full escalation flow: page → all → deselect one → clear", () => {
    let state = selectionReducer(EMPTY_SELECTION, { pageIds: ["t1", "t2"], type: "SELECT_PAGE" });
    expect(selectionCount(state, 8214)).toBe(2);

    state = selectionReducer(state, { filter: NO_FILTER, type: "SELECT_ALL_MATCHING" });
    expect(selectionCount(state, 8214)).toBe(8214);

    state = selectionReducer(state, { id: "t5", type: "TOGGLE_ROW" });
    expect(selectionCount(state, 8214)).toBe(8213);

    state = selectionReducer(state, { type: "CLEAR" });
    expect(hasSelection(state)).toBe(false);
  });
});
