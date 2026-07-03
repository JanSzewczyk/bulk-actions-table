"use client";

import { toast } from "@szum-tech/design-system/components/toaster";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { UNDO_WINDOW_MS } from "~/features/tickets/constants";
import { useSelection, useSelectionFilterSync } from "~/features/tickets/context/selection.context";
import { type ActiveJob, useActiveJob } from "~/features/tickets/hooks/use-active-job";
import { useOutsideFilterCount } from "~/features/tickets/hooks/use-outside-filter-count";
import { BulkAction, type BulkActionOutcome, type BulkRequest } from "~/features/tickets/types/bulk";
import type { JobProgress } from "~/features/tickets/types/job";
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
  formatJobStartedMessage
} from "~/features/tickets/utils/bulk-outcome";
import { mergeTableQuery, stringifyTableQuery } from "~/features/tickets/utils/table-query-url";
import type { ActionResponse } from "~/lib/action-types";
import { BulkToolbar } from "./bulk-toolbar";
import { JobProgressBar } from "./job-progress-bar";
import { SelectionBanner } from "./selection-banner";
import { TableControls } from "./table-controls";
import { TablePagination } from "./table-pagination";
import { TicketsTable } from "./tickets-table";

type TicketsTableSectionProps = {
  tickets: Array<TicketListItem>;
  pagination: Pagination;
  query: TableQuery;
  teammates: Array<Teammate>;
  onBulkAction(request: BulkRequest, idempotencyKey: string): ActionResponse<BulkActionOutcome>;
  onOutsideFilterCountAction(ids: Array<string>, filter: TableFilter): ActionResponse<number>;
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
  onPollJobAction,
  onGetJobFailedIdsAction
}: TicketsTableSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [isSubmitting, startSubmitTransition] = React.useTransition();
  const { selection, dispatch } = useSelection();

  const filter: TableFilter = { q: query.q, status: query.status };
  const pageIds = tickets.map((ticket) => ticket.id);

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

    // Delete gets its own undo toast below instead of a plain success toast — showing both would
    // duplicate the same message.
    if (failed.length === 0 && request.action !== BulkAction.DELETE) {
      toast.success(formatBulkSuccessMessage(request.action, succeeded.length));
    } else if (failed.length > 0) {
      const failedIds = failed.map((item) => item.id);
      toast.error(formatBulkPartialFailureMessage(request.action, succeeded.length, failed.length), {
        action: {
          label: `Retry (${failed.length})`,
          onClick: () => submitBulkRequest(buildRetryRequest(request, failedIds))
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
    startSubmitTransition(async () => {
      const result = await onBulkAction(request, idempotencyKey);
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
      <TableControls isPending={isPending} onQueryChange={applyQuery} query={query} />
      {jobProgress ? <JobProgressBar progress={jobProgress} /> : null}
      <BulkToolbar
        isSubmitting={isSubmitting}
        jobRunning={activeJob !== null}
        onSubmit={submitBulkRequest}
        outsideFilterCount={outsideFilterCount}
        teammates={teammates}
        total={pagination.total}
      />
      <SelectionBanner filter={filter} pageIds={pageIds} total={pagination.total} />
      <TicketsTable
        direction={query.direction}
        isPending={isPending}
        onSortChange={handleSortChange}
        sort={query.sort}
        teammates={teammates}
        tickets={tickets}
      />
      <TablePagination isPending={isPending} onQueryChange={applyQuery} pagination={pagination} query={query} />
    </div>
  );
}
