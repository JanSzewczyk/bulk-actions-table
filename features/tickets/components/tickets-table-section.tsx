"use client";

import { toast } from "@szum-tech/design-system/components/toaster";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { TableControls } from "~/features/tickets/components/tickets-table-controls/table-controls";
import { UNDO_WINDOW_MS } from "~/features/tickets/constants";
import { useSelection, useSelectionFilterSync } from "~/features/tickets/context/selection.context";
import { type ActiveJob, useActiveJob } from "~/features/tickets/hooks/use-active-job";
import { useOutsideFilterCount } from "~/features/tickets/hooks/use-outside-filter-count";
import {
  BulkAction,
  type BulkActionOutcome,
  type BulkRequest,
  type FailureReason
} from "~/features/tickets/types/bulk";
import { type JobProgress, JobStatus } from "~/features/tickets/types/job";
import {
  type Pagination,
  SortDirection,
  type TableFilter,
  type TableQuery,
  type TicketSortField
} from "~/features/tickets/types/table-query";
import type { Teammate } from "~/features/tickets/types/teammate";
import type { TicketListItem } from "~/features/tickets/types/ticket";
import {
  buildRestoreRequest,
  buildRetryRequest,
  formatBulkPartialFailureMessage,
  formatBulkSuccessMessage,
  formatDeleteUndoMessage,
  formatJobCompletedFailureMessage,
  formatJobCompletedSuccessMessage,
  formatJobCrashedMessage,
  formatJobLostMessage,
  formatJobStartedMessage
} from "~/features/tickets/utils/bulk-outcome";
import { mergeTableQuery, stringifyTableQuery } from "~/features/tickets/utils/table-query-url";
import type { ActionResponse } from "~/lib/action-types";
import { BulkToolbar } from "./bulk-toolbar";
import { JobProgressBar } from "./job-progress-bar";
import { SelectionBanner } from "./selection-banner";
import { TablePagination } from "./table-pagination";
import { TicketsTable } from "./tickets-table";

type TicketsTableSectionProps = {
  tickets: Array<TicketListItem>;
  pagination: Pagination;
  query: TableQuery;
  teammates: Array<Teammate>;
  onBulkAction(request: BulkRequest, idempotencyKey: string): ActionResponse<BulkActionOutcome>;
  onOutsideFilterCountAction(ids: Array<string>, filter: TableFilter): ActionResponse<number>;
  onRefreshMatchingCountAction(filter: TableFilter): ActionResponse<number>;
  onPollJobAction(jobId: string): ActionResponse<JobProgress>;
  onGetJobFailedIdsAction(jobId: string): ActionResponse<Array<string>>;
};

/**
 * Owns bulk-submission end to end (sync/async branching, partial-failure and undo toasts, job
 * polling) rather than the toolbar, because an active selection — and with it the toolbar — clears
 * the moment an action escalates to an async job. This component sits above that churn, survives
 * `router.refresh()`, and is the only stable place to track a running job across its lifetime.
 *
 * The mechanics — job persistence/polling (`useActiveJob`), outside-filter-count fetching
 * (`useOutsideFilterCount`), selection/filter reconciliation (`useSelectionFilterSync`), and the
 * outcome copy (`utils/bulk-outcome`) — live in dedicated, independently testable modules. This
 * component's own job is to coordinate them and decide what to show the user for each outcome.
 */
export function TicketsTableSection({
  tickets,
  pagination,
  query,
  teammates,
  onBulkAction,
  onOutsideFilterCountAction,
  onRefreshMatchingCountAction,
  onPollJobAction,
  onGetJobFailedIdsAction
}: TicketsTableSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [isSubmitting, startSubmitTransition] = React.useTransition();
  const { selection, dispatch } = useSelection();
  // Ids currently in flight for the row-level pending/spinner state — cleared as soon as the
  // request settles, regardless of the sync/async outcome (an escalated 202 response is itself fast).
  const [pendingIds, setPendingIds] = React.useState<ReadonlySet<string>>(new Set());
  // Failed-and-still-selected ids from the last outcome, id → reason, for the row-level error marker.
  // Cleared per id as soon as a later attempt (retry/undo) succeeds on it.
  const [failedIds, setFailedIds] = React.useState<ReadonlyMap<string, FailureReason>>(new Map());

  const filter: TableFilter = { assigneeIds: query.assigneeIds, q: query.q, status: query.status };
  const pageIds = tickets.map((ticket) => ticket.id);

  /** Only the visible page can show per-row pending — `mode: 'all'` never materializes every id. */
  function computeVisiblePendingIds(request: BulkRequest): Set<string> {
    if (request.mode === "include") {
      const targetIds = new Set(request.ids);
      return new Set(pageIds.filter((id) => targetIds.has(id)));
    }
    const excluded = new Set(request.excluded);
    return new Set(pageIds.filter((id) => !excluded.has(id)));
  }

  useSelectionFilterSync(filter, () => toast.info("Selection cleared after the filter changed."));
  const outsideFilterCount = useOutsideFilterCount({ filter, onOutsideFilterCountAction, selection });

  function handleOutcome(request: BulkRequest, outcome: BulkActionOutcome) {
    if (outcome.mode === "async") {
      toast.info(formatJobStartedMessage(outcome.total));
      dispatch({ type: "CLEAR" });
      startJob({ action: request.action, assigneeId: request.assigneeId, jobId: outcome.jobId });
      return;
    }

    const { succeeded, failed } = outcome.result;
    if (succeeded.length > 0) {
      dispatch({ ids: succeeded, type: "REMOVE_IDS" });
    }

    // Row-level error marker: a later attempt clears a ticket's own failure, then it may pick up a
    // fresh one from this same outcome.
    setFailedIds((previous) => {
      const next = new Map(previous);
      for (const id of succeeded) {
        next.delete(id);
      }
      for (const item of failed) {
        next.set(item.id, item.reason);
      }
      return next;
    });

    // Delete gets its own undo toast below instead of a plain success toast — showing both would
    // duplicate the same message.
    if (failed.length === 0 && request.action !== BulkAction.DELETE) {
      toast.success(formatBulkSuccessMessage(request.action, succeeded.length));
    } else if (failed.length > 0) {
      const failedIdList = failed.map((item) => item.id);
      toast.error(formatBulkPartialFailureMessage(request.action, succeeded.length, failed.length), {
        action: {
          label: `Retry (${failed.length})`,
          onClick: () => submitBulkRequest(buildRetryRequest(request, failedIdList))
        },
        // A toast with a retry action needs to outlive sonner's default ~4s — otherwise the one
        // affordance that matters most on a partial failure disappears before it can be clicked.
        duration: UNDO_WINDOW_MS
      });
    }

    if (request.action === BulkAction.DELETE && succeeded.length > 0) {
      toast(formatDeleteUndoMessage(succeeded.length), {
        action: {
          label: "Undo",
          onClick: () => submitBulkRequest(buildRestoreRequest(succeeded))
        },
        duration: UNDO_WINDOW_MS
      });
    }

    router.refresh();
  }

  function submitBulkRequest(request: BulkRequest) {
    const idempotencyKey = crypto.randomUUID();
    setPendingIds(computeVisiblePendingIds(request));
    startSubmitTransition(async () => {
      const result = await onBulkAction(request, idempotencyKey);
      setPendingIds(new Set());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      handleOutcome(request, result.data);
    });
  }

  async function retryJobFailures(job: ActiveJob) {
    const idsResult = await onGetJobFailedIdsAction(job.jobId);
    if (!idsResult.success || idsResult.data.length === 0) {
      return;
    }
    submitBulkRequest({
      action: job.action,
      assigneeId: job.assigneeId,
      ids: idsResult.data,
      mode: "include"
    });
  }

  const { activeJob, jobProgress, startJob } = useActiveJob({
    onCompleted: (completedJob, finalProgress) => {
      router.refresh();

      // The runner threw before finishing — distinct from a normal completion, since `processed`
      // reflects only what ran before the crash, not the full requested batch.
      if (finalProgress.status === JobStatus.FAILED) {
        toast.error(formatJobCrashedMessage(finalProgress), {
          action:
            finalProgress.failedCount > 0
              ? {
                  label: `Retry failed (${finalProgress.failedCount})`,
                  onClick: () => {
                    void retryJobFailures(completedJob);
                  }
                }
              : undefined,
          duration: UNDO_WINDOW_MS
        });
        return;
      }

      if (finalProgress.failedCount > 0) {
        toast.error(formatJobCompletedFailureMessage(finalProgress), {
          action: {
            label: `Retry failed (${finalProgress.failedCount})`,
            onClick: () => {
              void retryJobFailures(completedJob);
            }
          },
          duration: UNDO_WINDOW_MS
        });
      } else {
        toast.success(formatJobCompletedSuccessMessage(finalProgress));
      }
    },
    // Polling gave up after repeated failed requests (lost connection, or the server lost the job —
    // e.g. a restart wiped the in-memory store). `router.refresh()` lets the user see the table's
    // actual current state instead of trusting a job we can no longer track.
    onLost: () => {
      router.refresh();
      toast.error(formatJobLostMessage());
    },
    onPollAction: onPollJobAction
  });

  function applyQuery(patch: Partial<TableQuery>) {
    const nextQuery = mergeTableQuery(query, patch);
    const queryString = stringifyTableQuery(nextQuery);
    startTransition(() => router.push(queryString.length > 0 ? `${pathname}?${queryString}` : pathname));
  }

  function handleSortChange(field: TicketSortField) {
    // Three clicks per column: ascending → descending → off (back to unsorted).
    if (query.sort !== field) {
      applyQuery({ direction: SortDirection.ASC, sort: field });
      return;
    }
    if (query.direction === SortDirection.ASC) {
      applyQuery({ direction: SortDirection.DESC, sort: field });
      return;
    }
    applyQuery({ direction: null, sort: null });
  }

  return (
    <div className="flex flex-col gap-4">
      <TableControls isPending={isPending} onQueryChange={applyQuery} query={query} teammates={teammates} />
      {jobProgress && activeJob ? <JobProgressBar action={activeJob.action} progress={jobProgress} /> : null}
      <BulkToolbar
        filter={filter}
        isSubmitting={isSubmitting}
        jobRunning={activeJob !== null}
        onRefreshMatchingCountAction={onRefreshMatchingCountAction}
        onSubmit={submitBulkRequest}
        outsideFilterCount={outsideFilterCount}
        teammates={teammates}
        total={pagination.total}
      />
      <SelectionBanner filter={filter} pageIds={pageIds} total={pagination.total} />
      <TicketsTable
        direction={query.direction}
        failedIds={failedIds}
        isPending={isPending}
        onSortChange={handleSortChange}
        pendingIds={pendingIds}
        sort={query.sort}
        teammates={teammates}
        tickets={tickets}
      />
      <TablePagination isPending={isPending} onQueryChange={applyQuery} pagination={pagination} query={query} />
    </div>
  );
}
