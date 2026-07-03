"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { ArchiveIcon, Trash2Icon, XIcon } from "lucide-react";
import * as React from "react";
import { UNDO_WINDOW_MS } from "~/features/tickets/constants";
import { useSelection } from "~/features/tickets/hooks/use-selection";
import { hasSelection, selectionCount } from "~/features/tickets/lib/selection";
import { formatCount } from "~/features/tickets/lib/ticket-presentation";
import { BulkAction, type BulkRequest } from "~/features/tickets/types/bulk";
import { SelectionMode } from "~/features/tickets/types/selection";
import type { Teammate } from "~/features/tickets/types/teammate";
import { AssignPopover } from "./assign-popover";
import { ConfirmDialog } from "./confirm-dialog";

type BulkToolbarProps = {
  /** Total rows matching the active filter — needed to count an `all` selection. */
  total: number;
  /** How many picked ids fall outside the current filter (include mode only). */
  outsideFilterCount: number;
  teammates: Array<Teammate>;
  /** True while a sync request is in flight. */
  isSubmitting: boolean;
  /** True while an async job from a previous action is still running (D14 — blocks starting another). */
  jobRunning: boolean;
  onSubmit(request: BulkRequest): void;
};

type PendingConfirmation = { action: BulkAction; assigneeId?: string };

/**
 * Action bar shown only while a selection is active. `mode: 'all'` always requires a confirmation
 * dialog regardless of action; delete requires it unconditionally. Submission itself (sync/async
 * branching, partial-failure toasts, retry, undo) is owned by the parent section so it can keep
 * working across an async job even after this toolbar unmounts (an active selection clears once a
 * job starts).
 */
export function BulkToolbar({
  total,
  outsideFilterCount,
  teammates,
  isSubmitting,
  jobRunning,
  onSubmit
}: BulkToolbarProps) {
  const { selection, dispatch } = useSelection();
  const [pendingAction, setPendingAction] = React.useState<PendingConfirmation | null>(null);
  // Whatever's focused when a confirmation opens (the Archive/Delete button, or the assign-popover
  // item) — restored on close via ConfirmDialog's `onCloseAutoFocus` (see there for why).
  const lastTriggerRef = React.useRef<HTMLElement | null>(null);

  if (!hasSelection(selection)) {
    return null;
  }

  const count = selectionCount(selection, total);
  const actionsDisabled = isSubmitting || jobRunning;

  function buildRequest(action: BulkAction, assigneeId: string | undefined): BulkRequest {
    if (selection.mode === SelectionMode.INCLUDE) {
      return { action, assigneeId, ids: Array.from(selection.ids), mode: "include" };
    }
    return {
      action,
      assigneeId,
      excluded: Array.from(selection.excluded),
      filter: selection.filter,
      mode: "all"
    };
  }

  function openConfirmation(pending: PendingConfirmation) {
    lastTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPendingAction(pending);
  }

  function requestArchive() {
    if (selection.mode === SelectionMode.ALL) {
      openConfirmation({ action: BulkAction.ARCHIVE });
      return;
    }
    onSubmit(buildRequest(BulkAction.ARCHIVE, undefined));
  }

  function requestAssign(teammateId: string) {
    if (selection.mode === SelectionMode.ALL) {
      openConfirmation({ action: BulkAction.ASSIGN, assigneeId: teammateId });
      return;
    }
    onSubmit(buildRequest(BulkAction.ASSIGN, teammateId));
  }

  function requestUnassign() {
    if (selection.mode === SelectionMode.ALL) {
      openConfirmation({ action: BulkAction.UNASSIGN });
      return;
    }
    onSubmit(buildRequest(BulkAction.UNASSIGN, undefined));
  }

  function requestDelete() {
    openConfirmation({ action: BulkAction.DELETE });
  }

  function confirmPendingAction() {
    if (pendingAction) {
      onSubmit(buildRequest(pendingAction.action, pendingAction.assigneeId));
    }
    setPendingAction(null);
  }

  function closePendingConfirmation(open: boolean) {
    if (!open) {
      setPendingAction(null);
    }
  }

  const isDeleteConfirmation = pendingAction?.action === BulkAction.DELETE;
  const confirmTitle = isDeleteConfirmation ? "Delete selected tickets" : "Confirm bulk-wide action";
  const confirmDescription = isDeleteConfirmation
    ? `This can't be undone after ${Math.round(UNDO_WINDOW_MS / 1000)}s. Delete ${formatCount(count)} tickets?`
    : `This will affect all ${formatCount(count)} matching tickets, not just the current page.`;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-2 shadow-sm">
      <p className="font-semibold text-body-sm">
        Selected {formatCount(count)}
        {outsideFilterCount > 0 ? (
          <span className="font-normal text-muted-foreground"> ({outsideFilterCount} outside the current filter)</span>
        ) : null}
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button
          disabled={actionsDisabled}
          onClick={requestArchive}
          size="sm"
          startIcon={<ArchiveIcon />}
          variant="outline"
        >
          Archive
        </Button>
        <AssignPopover
          disabled={actionsDisabled}
          onAssign={requestAssign}
          onUnassign={requestUnassign}
          teammates={teammates}
        />
        <Button disabled={actionsDisabled} onClick={requestDelete} size="sm" startIcon={<Trash2Icon />} variant="error">
          Delete
        </Button>
        <Button aria-label="Clear selection" onClick={() => dispatch({ type: "CLEAR" })} size="icon-sm" variant="ghost">
          <XIcon />
        </Button>
      </div>
      <ConfirmDialog
        confirmLabel={isDeleteConfirmation ? "Delete" : "Confirm"}
        description={confirmDescription}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          lastTriggerRef.current?.focus();
        }}
        onConfirm={confirmPendingAction}
        onOpenChange={closePendingConfirmation}
        open={pendingAction !== null}
        title={confirmTitle}
      />
    </div>
  );
}
