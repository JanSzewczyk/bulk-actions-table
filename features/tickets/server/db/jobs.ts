import "server-only";

import type { BulkAction, FailureReason } from "~/features/tickets/types/bulk";
import { JobStatus } from "~/features/tickets/types/job";
import { getStore } from "./store";

/** Creates a `RUNNING` job record and returns its id. A background runner fills in its progress. */
export function createJob(action: BulkAction, total: number): string {
  const id = crypto.randomUUID();
  getStore().jobs.set(id, {
    action,
    failedCount: 0,
    failures: [],
    id,
    processed: 0,
    status: JobStatus.RUNNING,
    succeeded: 0,
    total
  });
  return id;
}

/** Records one successfully processed item. A missing job (e.g. process restart) is a silent no-op. */
export function recordJobSuccess(jobId: string): void {
  const job = getStore().jobs.get(jobId);
  if (!job) {
    return;
  }
  job.processed += 1;
  job.succeeded += 1;
}

/** Records one failed item, appending it to the job's paginated failure list. */
export function recordJobFailure(jobId: string, id: string, reason: FailureReason): void {
  const job = getStore().jobs.get(jobId);
  if (!job) {
    return;
  }
  job.processed += 1;
  job.failedCount += 1;
  job.failures.push({ id, reason });
}

/** Marks a job `COMPLETED` once every item has been processed. */
export function finalizeJob(jobId: string): void {
  const job = getStore().jobs.get(jobId);
  if (!job) {
    return;
  }
  job.status = JobStatus.COMPLETED;
}
