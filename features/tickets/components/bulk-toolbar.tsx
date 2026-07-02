"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { toast } from "@szum-tech/design-system/components/toaster";
import { ArchiveIcon, Trash2Icon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { UNDO_WINDOW_MS } from "~/features/tickets/constants";
import { useSelection } from "~/features/tickets/hooks/use-selection";
import { hasSelection, selectionCount } from "~/features/tickets/lib/selection";
import { formatCount } from "~/features/tickets/lib/ticket-presentation";
import {
  BulkAction,
  type BulkActionOutcome,
  type BulkRequest,
  type SimulationParams
} from "~/features/tickets/types/bulk";
import { SelectionMode } from "~/features/tickets/types/selection";
import type { Teammate } from "~/features/tickets/types/teammate";
import type { ActionResponse } from "~/lib/action-types";
import { AssignPopover } from "./assign-popover";
import { ConfirmDialog } from "./confirm-dialog";

type BulkToolbarProps = {
  /** Total rows matching the active filter — needed to count an `all` selection. */
  total: number;
  /** How many picked ids fall outside the current filter (include mode only). */
  outsideFilterCount: number;
  teammates: Array<Teammate>;
  simulation: SimulationParams;
  onBulkAction(request: BulkRequest, idempotencyKey: string): ActionResponse<BulkActionOutcome>;
};

type PendingConfirmation = { action: BulkAction; assigneeId?: string };

const ACTION_VERB: Record<BulkAction, string> = {
  [BulkAction.ARCHIVE]: "Zarchiwizowano",
  [BulkAction.ASSIGN]: "Przypisano",
  [BulkAction.DELETE]: "Usunięto",
  [BulkAction.RESTORE]: "Przywrócono"
};

/**
 * Action bar shown only while a selection is active. `mode: 'all'` always requires a confirmation
 * dialog regardless of action; delete requires it unconditionally. A partial failure leaves the
 * failed ids selected (already reflected by the reducer) and offers a one-click retry scoped to just
 * those ids; a successful delete also gets an undo toast that re-invokes the same ids as a restore.
 */
export function BulkToolbar({ total, outsideFilterCount, teammates, simulation, onBulkAction }: BulkToolbarProps) {
  const router = useRouter();
  const { selection, dispatch } = useSelection();
  const [isPending, startTransition] = React.useTransition();
  const [pendingAction, setPendingAction] = React.useState<PendingConfirmation | null>(null);

  if (!hasSelection(selection)) {
    return null;
  }

  const count = selectionCount(selection, total);

  function buildRequest(action: BulkAction, assigneeId: string | undefined): BulkRequest {
    if (selection.mode === SelectionMode.INCLUDE) {
      return { action, assigneeId, ...simulation, ids: Array.from(selection.ids), mode: "include" };
    }
    return {
      action,
      assigneeId,
      ...simulation,
      excluded: Array.from(selection.excluded),
      filter: selection.filter,
      mode: "all"
    };
  }

  function buildRetryRequest(source: BulkRequest, ids: Array<string>): BulkRequest {
    return {
      action: source.action,
      assigneeId: source.assigneeId,
      concurrency: source.concurrency,
      failureRate: source.failureRate,
      ids,
      mode: "include",
      seed: source.seed
    };
  }

  function buildRestoreRequest(source: BulkRequest, ids: Array<string>): BulkRequest {
    return {
      action: BulkAction.RESTORE,
      concurrency: source.concurrency,
      failureRate: source.failureRate,
      ids,
      mode: "include",
      seed: source.seed
    };
  }

  function submit(request: BulkRequest) {
    const idempotencyKey = crypto.randomUUID();
    startTransition(async () => {
      const result = await onBulkAction(request, idempotencyKey);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      handleOutcome(request, result.data);
    });
  }

  function handleOutcome(request: BulkRequest, outcome: BulkActionOutcome) {
    if (outcome.mode === "async") {
      toast.info(`Rozpoczęto operację w tle dla ${formatCount(outcome.total)} zgłoszeń.`);
      dispatch({ type: "CLEAR" });
      router.refresh();
      return;
    }

    const { succeeded, failed } = outcome.result;
    if (succeeded.length > 0) {
      dispatch({ ids: succeeded, type: "REMOVE_IDS" });
    }

    // Delete gets its own undo toast below instead of a plain success toast — showing both would
    // duplicate the same message.
    if (failed.length === 0 && request.action !== BulkAction.DELETE) {
      toast.success(`${ACTION_VERB[request.action]} ${formatCount(succeeded.length)} zgłoszeń.`);
    } else if (failed.length > 0) {
      const failedIds = failed.map((item) => item.id);
      toast.error(
        `${ACTION_VERB[request.action]} ${formatCount(succeeded.length)} z ${formatCount(succeeded.length + failed.length)} · ${formatCount(failed.length)} błędów.`,
        {
          action: {
            label: `Ponów (${failed.length})`,
            onClick: () => submit(buildRetryRequest(request, failedIds))
          }
        }
      );
    }

    if (request.action === BulkAction.DELETE && succeeded.length > 0) {
      toast(`Usunięto ${formatCount(succeeded.length)} zgłoszeń.`, {
        action: {
          label: "Cofnij",
          onClick: () => submit(buildRestoreRequest(request, succeeded))
        },
        duration: UNDO_WINDOW_MS
      });
    }

    router.refresh();
  }

  function requestArchive() {
    if (selection.mode === SelectionMode.ALL) {
      setPendingAction({ action: BulkAction.ARCHIVE });
      return;
    }
    submit(buildRequest(BulkAction.ARCHIVE, undefined));
  }

  function requestAssign(teammateId: string) {
    if (selection.mode === SelectionMode.ALL) {
      setPendingAction({ action: BulkAction.ASSIGN, assigneeId: teammateId });
      return;
    }
    submit(buildRequest(BulkAction.ASSIGN, teammateId));
  }

  function requestDelete() {
    setPendingAction({ action: BulkAction.DELETE });
  }

  function confirmPendingAction() {
    if (pendingAction) {
      submit(buildRequest(pendingAction.action, pendingAction.assigneeId));
    }
    setPendingAction(null);
  }

  function closePendingConfirmation(open: boolean) {
    if (!open) {
      setPendingAction(null);
    }
  }

  const isDeleteConfirmation = pendingAction?.action === BulkAction.DELETE;
  const confirmTitle = isDeleteConfirmation ? "Usuń zaznaczone zgłoszenia" : "Potwierdź operację na całym zbiorze";
  const confirmDescription = isDeleteConfirmation
    ? `Tej operacji nie da się cofnąć po ${Math.round(UNDO_WINDOW_MS / 1000)}s. Usunąć ${formatCount(count)} zgłoszeń?`
    : `Ta operacja obejmie wszystkie ${formatCount(count)} pasujących zgłoszeń, nie tylko bieżącą stronę.`;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-2 shadow-sm">
      <p className="font-semibold text-body-sm">
        Zaznaczono {formatCount(count)}
        {outsideFilterCount > 0 ? (
          <span className="font-normal text-muted-foreground"> ({outsideFilterCount} poza bieżącym filtrem)</span>
        ) : null}
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button disabled={isPending} onClick={requestArchive} size="sm" startIcon={<ArchiveIcon />} variant="outline">
          Archiwizuj
        </Button>
        <AssignPopover disabled={isPending} onAssign={requestAssign} teammates={teammates} />
        <Button disabled={isPending} onClick={requestDelete} size="sm" startIcon={<Trash2Icon />} variant="error">
          Usuń
        </Button>
        <Button
          aria-label="Wyczyść zaznaczenie"
          disabled={isPending}
          onClick={() => dispatch({ type: "CLEAR" })}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon />
        </Button>
      </div>
      <ConfirmDialog
        confirmLabel={isDeleteConfirmation ? "Usuń" : "Potwierdź"}
        description={confirmDescription}
        onConfirm={confirmPendingAction}
        onOpenChange={closePendingConfirmation}
        open={pendingAction !== null}
        title={confirmTitle}
      />
    </div>
  );
}
