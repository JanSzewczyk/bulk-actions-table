"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { ArchiveIcon, Trash2Icon, UserPlusIcon, XIcon } from "lucide-react";
import { useSelection } from "~/features/tickets/hooks/use-selection";
import { hasSelection, selectionCount } from "~/features/tickets/lib/selection";
import { formatCount } from "~/features/tickets/lib/ticket-presentation";

type BulkToolbarProps = {
  /** Total rows matching the active filter — needed to count an `all` selection. */
  total: number;
  /** How many picked ids fall outside the current filter (include mode only). */
  outsideFilterCount: number;
};

/**
 * Action bar shown only while a selection is active. The count reflects the whole selection (across
 * pages and, in `all` mode, everything matching the filter), and warns when part of it sits outside
 * the current filter. The three bulk actions are wired in the next stage.
 */
export function BulkToolbar({ total, outsideFilterCount }: BulkToolbarProps) {
  const { selection, dispatch } = useSelection();

  if (!hasSelection(selection)) {
    return null;
  }

  const count = selectionCount(selection, total);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-2 shadow-sm">
      <p className="font-semibold text-body-sm">
        Zaznaczono {formatCount(count)}
        {outsideFilterCount > 0 ? (
          <span className="font-normal text-muted-foreground"> ({outsideFilterCount} poza bieżącym filtrem)</span>
        ) : null}
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button disabled size="sm" startIcon={<ArchiveIcon />} variant="outline">
          Archiwizuj
        </Button>
        <Button disabled size="sm" startIcon={<UserPlusIcon />} variant="outline">
          Przypisz do…
        </Button>
        <Button disabled size="sm" startIcon={<Trash2Icon />} variant="error">
          Usuń
        </Button>
        <Button
          aria-label="Wyczyść zaznaczenie"
          onClick={() => dispatch({ type: "CLEAR" })}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
