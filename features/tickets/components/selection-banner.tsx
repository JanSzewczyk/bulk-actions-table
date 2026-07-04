"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { EXCLUDED_COUNT_WARNING_THRESHOLD, EXCLUDED_RATIO_WARNING_THRESHOLD } from "~/features/tickets/constants";
import { useSelection } from "~/features/tickets/context/selection.context";
import { SelectionMode } from "~/features/tickets/types/selection";
import type { TableFilter } from "~/features/tickets/types/table-query";
import {
  isExcludedApproachingTotal,
  PageCheckboxState,
  pageCheckboxState,
  selectionCount
} from "~/features/tickets/utils/selection";
import { formatCount } from "~/features/tickets/utils/ticket-presentation";

type SelectionBannerProps = {
  /** Ids of the rows currently on screen — the header checkbox scopes to these. */
  pageIds: Array<string>;
  /** Total rows matching the active filter, from the server (drives "select all N"). */
  total: number;
  /** The active filter, so escalation binds the `all` selection to the right scope. */
  filter: TableFilter;
};

/**
 * The escalation strip above the table. In `include` mode it appears once the whole visible page is
 * checked and offers to select everything matching the filter — always a deliberate second click.
 * In `all` mode it confirms the wide selection and offers to clear it.
 */
export function SelectionBanner({ pageIds, total, filter }: SelectionBannerProps) {
  const { selection, dispatch } = useSelection();

  if (selection.mode === SelectionMode.ALL) {
    const nearlyAllExcluded = isExcludedApproachingTotal(
      selection,
      total,
      EXCLUDED_RATIO_WARNING_THRESHOLD,
      EXCLUDED_COUNT_WARNING_THRESHOLD
    );
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-body-sm">
        <span>
          Selected all <strong>{formatCount(selectionCount(selection, total))}</strong> matching.
        </span>
        {nearlyAllExcluded ? (
          <span className="text-muted-foreground">
            You've deselected {formatCount(selection.excluded.size)} rows one by one — it may be simpler to clear and
            pick the ones you want instead.
          </span>
        ) : null}
        <Button onClick={() => dispatch({ type: "CLEAR" })} size="sm" variant="link">
          Clear selection
        </Button>
      </div>
    );
  }

  const wholePageSelected = pageCheckboxState(selection, pageIds) === PageCheckboxState.CHECKED;
  const canEscalate = wholePageSelected && total > selection.ids.size;

  if (!canEscalate) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-2 text-body-sm">
      <span>
        {/* `wholePageSelected` guarantees every id in `pageIds` is selected, so that — not the running
        cross-page total in `selection.ids.size` — is what "on this page" means. Without this, selecting
        a second page on top of an already-selected first page mislabels the combined total as if it
        were all sitting on the current page. */}
        Selected <strong>{pageIds.length}</strong> on this page.
      </span>
      <Button onClick={() => dispatch({ filter, type: "SELECT_ALL_MATCHING" })} size="sm" variant="link">
        Select all {formatCount(total)} matching
      </Button>
    </div>
  );
}
