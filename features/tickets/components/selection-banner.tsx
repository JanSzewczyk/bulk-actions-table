"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { useSelection } from "~/features/tickets/hooks/use-selection";
import { PageCheckboxState, pageCheckboxState, selectionCount } from "~/features/tickets/lib/selection";
import { formatCount } from "~/features/tickets/lib/ticket-presentation";
import { SelectionMode } from "~/features/tickets/types/selection";
import type { TableFilter } from "~/features/tickets/types/table-query";

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
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-body-sm">
        <span>
          Zaznaczono wszystkie <strong>{formatCount(selectionCount(selection, total))}</strong> pasujące.
        </span>
        <Button onClick={() => dispatch({ type: "CLEAR" })} size="sm" variant="link">
          Wyczyść zaznaczenie
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
        Zaznaczono <strong>{selection.ids.size}</strong> na tej stronie.
      </span>
      <Button onClick={() => dispatch({ filter, type: "SELECT_ALL_MATCHING" })} size="sm" variant="link">
        Zaznacz wszystkie {formatCount(total)} pasujące
      </Button>
    </div>
  );
}
