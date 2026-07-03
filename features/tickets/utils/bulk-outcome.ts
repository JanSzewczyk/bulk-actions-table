import { BulkAction, type BulkRequest } from "~/features/tickets/types/bulk";
import type { JobProgress } from "~/features/tickets/types/job";
import { formatCount } from "./ticket-presentation";

/**
 * Pure helpers for reacting to a bulk-action outcome — request builders for retry/undo, and the
 * toast copy shown for each outcome shape (sync success/partial-failure, delete-undo, async job
 * start/completion). Kept framework-free and side-effect-free (no `toast` calls here) so the
 * copy/logic is unit-testable without mounting a component.
 */

const ACTION_VERB: Record<BulkAction, string> = {
  [BulkAction.ARCHIVE]: "Archived",
  [BulkAction.ASSIGN]: "Assigned",
  [BulkAction.DELETE]: "Deleted",
  [BulkAction.RESTORE]: "Restored",
  [BulkAction.UNASSIGN]: "Unassigned"
};

const ACTION_PROGRESS_VERB: Record<BulkAction, string> = {
  [BulkAction.ARCHIVE]: "Archiving",
  [BulkAction.ASSIGN]: "Assigning",
  [BulkAction.DELETE]: "Deleting",
  [BulkAction.RESTORE]: "Restoring",
  [BulkAction.UNASSIGN]: "Unassigning"
};

/** Label for the async job progress bar, e.g. "Archiving…" — read from the job, not a generic string. */
export function formatJobProgressLabel(action: BulkAction): string {
  return `${ACTION_PROGRESS_VERB[action]}…`;
}

/** Re-submits only the ids a bulk action failed on, keeping the same action/assignee. */
export function buildRetryRequest(source: BulkRequest, ids: Array<string>): BulkRequest {
  return {
    action: source.action,
    assigneeId: source.assigneeId,
    ids,
    mode: "include"
  };
}

/** Undoes a delete by restoring the given ids. */
export function buildRestoreRequest(ids: Array<string>): BulkRequest {
  return {
    action: BulkAction.RESTORE,
    ids,
    mode: "include"
  };
}

export function formatJobStartedMessage(total: number): string {
  return `Started a background job for ${formatCount(total)} tickets.`;
}

export function formatBulkSuccessMessage(action: BulkAction, succeededCount: number): string {
  return `${ACTION_VERB[action]} ${formatCount(succeededCount)} tickets.`;
}

export function formatBulkPartialFailureMessage(
  action: BulkAction,
  succeededCount: number,
  failedCount: number
): string {
  return `${ACTION_VERB[action]} ${formatCount(succeededCount)} of ${formatCount(succeededCount + failedCount)} · ${formatCount(failedCount)} failed.`;
}

export function formatDeleteUndoMessage(succeededCount: number): string {
  return `Deleted ${formatCount(succeededCount)} tickets.`;
}

export function formatJobCompletedFailureMessage(progress: JobProgress): string {
  return `Background job finished: ${formatCount(progress.succeeded)} of ${formatCount(progress.total)} · ${formatCount(progress.failedCount)} failed.`;
}

export function formatJobCompletedSuccessMessage(progress: JobProgress): string {
  return `Background job finished: ${formatCount(progress.succeeded)} tickets.`;
}

/** Shown when the runner threw before finishing — distinct from a normal completion, partial or not. */
export function formatJobCrashedMessage(progress: JobProgress): string {
  return `Background job stopped unexpectedly after ${formatCount(progress.processed)} of ${formatCount(progress.total)} tickets.`;
}

/** Shown when polling itself could not reach the job (lost connection, or the server lost the job). */
export function formatJobLostMessage(): string {
  return "Lost track of the background job. Refresh to check whether it finished.";
}
