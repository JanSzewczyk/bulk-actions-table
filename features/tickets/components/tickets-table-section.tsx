"use client";

import { toast } from "@szum-tech/design-system/components/toaster";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { ACTIVE_JOB_STORAGE_KEY, UNDO_WINDOW_MS } from "~/features/tickets/constants";
import { useJobPolling } from "~/features/tickets/hooks/use-job-polling";
import { useSelection } from "~/features/tickets/hooks/use-selection";
import { mergeTableQuery, stringifyTableQuery } from "~/features/tickets/lib/table-query-url";
import { formatCount } from "~/features/tickets/lib/ticket-presentation";
import { BulkAction, type BulkActionOutcome, type BulkRequest } from "~/features/tickets/types/bulk";
import type { JobProgress } from "~/features/tickets/types/job";
import { SelectionMode } from "~/features/tickets/types/selection";
import {
  type Pagination,
  SortDirection,
  type TableFilter,
  type TableQuery,
  type TicketSortField
} from "~/features/tickets/types/table-query";
import type { Teammate } from "~/features/tickets/types/teammate";
import type { TicketListItem } from "~/features/tickets/types/ticket";
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

type ActiveJob = { jobId: string; action: BulkAction; assigneeId?: string };

const ACTION_VERB: Record<BulkAction, string> = {
  [BulkAction.ARCHIVE]: "Archived",
  [BulkAction.ASSIGN]: "Assigned",
  [BulkAction.DELETE]: "Deleted",
  [BulkAction.RESTORE]: "Restored",
  [BulkAction.UNASSIGN]: "Unassigned"
};

function buildRetryRequest(source: BulkRequest, ids: Array<string>): BulkRequest {
  return {
    action: source.action,
    assigneeId: source.assigneeId,
    ids,
    mode: "include"
  };
}

function buildRestoreRequest(ids: Array<string>): BulkRequest {
  return {
    action: BulkAction.RESTORE,
    ids,
    mode: "include"
  };
}

function readStoredActiveJob(): ActiveJob | null {
  const raw = sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as ActiveJob;
  } catch {
    return null;
  }
}

/**
 * Owns bulk-submission end to end (sync/async branching, partial-failure and undo toasts, job
 * polling) rather than the toolbar, because an active selection — and with it the toolbar — clears
 * the moment an action escalates to an async job. This component sits above that churn, survives
 * `router.refresh()`, and is the only stable place to track a running job across its lifetime.
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
  const [outsideFilterCount, setOutsideFilterCount] = React.useState(0);
  const [activeJob, setActiveJob] = React.useState<ActiveJob | null>(null);

  const filter: TableFilter = { q: query.q, status: query.status };
  const pageIds = tickets.map((ticket) => ticket.id);

  // Resume polling a job that was still running when the page was refreshed. Read in a mount effect
  // (never a useState initializer) so this stays SSR-safe — sessionStorage doesn't exist on the server.
  React.useEffect(() => {
    const stored = readStoredActiveJob();
    if (stored) {
      setActiveJob(stored);
    }
  }, []);

  function handleOutcome(request: BulkRequest, outcome: BulkActionOutcome) {
    if (outcome.mode === "async") {
      toast.info(`Started a background job for ${formatCount(outcome.total)} tickets.`);
      dispatch({ type: "CLEAR" });
      const job: ActiveJob = { action: request.action, assigneeId: request.assigneeId, jobId: outcome.jobId };
      sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(job));
      setActiveJob(job);
      return;
    }

    const { succeeded, failed } = outcome.result;
    if (succeeded.length > 0) {
      dispatch({ ids: succeeded, type: "REMOVE_IDS" });
    }

    // Delete gets its own undo toast below instead of a plain success toast — showing both would
    // duplicate the same message.
    if (failed.length === 0 && request.action !== BulkAction.DELETE) {
      toast.success(`${ACTION_VERB[request.action]} ${formatCount(succeeded.length)} tickets.`);
    } else if (failed.length > 0) {
      const failedIds = failed.map((item) => item.id);
      toast.error(
        `${ACTION_VERB[request.action]} ${formatCount(succeeded.length)} of ${formatCount(succeeded.length + failed.length)} · ${formatCount(failed.length)} failed.`,
        {
          action: {
            label: `Retry (${failed.length})`,
            onClick: () => submitBulkRequest(buildRetryRequest(request, failedIds))
          },
          // A toast with a retry action needs to outlive sonner's default ~4s — otherwise the one
          // affordance that matters most on a partial failure disappears before it can be clicked.
          duration: UNDO_WINDOW_MS
        }
      );
    }

    if (request.action === BulkAction.DELETE && succeeded.length > 0) {
      toast(`Deleted ${formatCount(succeeded.length)} tickets.`, {
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

  function handleJobCompleted(finalProgress: JobProgress) {
    const completedJob = activeJob;
    sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    setActiveJob(null);
    router.refresh();

    if (!completedJob) {
      return;
    }

    if (finalProgress.failedCount > 0) {
      toast.error(
        `Background job finished: ${formatCount(finalProgress.succeeded)} of ${formatCount(finalProgress.total)} · ${formatCount(finalProgress.failedCount)} failed.`,
        {
          action: {
            label: `Retry failed (${finalProgress.failedCount})`,
            onClick: () => {
              void retryJobFailures(completedJob);
            }
          },
          duration: UNDO_WINDOW_MS
        }
      );
    } else {
      toast.success(`Background job finished: ${formatCount(finalProgress.succeeded)} tickets.`);
    }
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

  const jobProgress = useJobPolling({
    jobId: activeJob?.jobId ?? null,
    onCompleted: handleJobCompleted,
    onPollAction: onPollJobAction
  });

  // Reset an `all` selection when the filter changes (it is scoped to the filter it was made under),
  // and tell the user why. An `include` selection is left untouched by the reducer.
  const previousFilterRef = React.useRef(filter);
  React.useEffect(() => {
    const previous = previousFilterRef.current;
    const nextFilter: TableFilter = { q: query.q, status: query.status };
    if (previous.status === nextFilter.status && previous.q === nextFilter.q) {
      return;
    }
    if (selection.mode === SelectionMode.ALL) {
      toast.info("Selection cleared after the filter changed.");
    }
    dispatch({ filter: nextFilter, type: "FILTER_CHANGED" });
    previousFilterRef.current = nextFilter;
  }, [query.q, query.status, selection.mode, dispatch]);

  // "N outside the current filter" — only meaningful for an `include` selection (an `all` selection
  // resets on filter change, so it's never stale).
  React.useEffect(() => {
    if (selection.mode !== SelectionMode.INCLUDE || selection.ids.size === 0) {
      setOutsideFilterCount(0);
      return;
    }

    let cancelled = false;
    const ids = Array.from(selection.ids);
    onOutsideFilterCountAction(ids, { q: query.q, status: query.status })
      .then((result) => {
        if (!cancelled && result.success) {
          setOutsideFilterCount(result.data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selection, query.q, query.status, onOutsideFilterCountAction]);

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
