import "server-only";

import type { BulkAction, FailureReason } from "~/features/tickets/types/bulk";
import { type Job, JobStatus } from "~/features/tickets/types/job";
import { getStore } from "./store";

/**
 * How long a finished (`COMPLETED`/`FAILED`) job's counters stay in the store before eviction — long
 * enough to cover a delayed poll or a resumed `sessionStorage` job after a page reload. Without this,
 * `jobs` grows without bound for the life of the process, since every submit creates a fresh entry
 * that nothing else ever removes. `RUNNING` jobs are never evicted by age — only a terminal status
 * makes a job eligible, so an in-progress job can't disappear out from under an active poller.
 */
const JOB_RETENTION_MS = 10 * 60 * 1000;

function evictStaleJobs(jobs: Map<string, Job>): void {
  const cutoff = Date.now() - JOB_RETENTION_MS;
  for (const [id, job] of jobs) {
    if (job.status !== JobStatus.RUNNING && job.createdAt < cutoff) {
      jobs.delete(id);
    }
  }
}

/** Creates a `RUNNING` job record and returns its id. A background runner fills in its progress. */
export function createJob(action: BulkAction, total: number): string {
  const { jobs } = getStore();
  evictStaleJobs(jobs);

  const id = crypto.randomUUID();
  jobs.set(id, {
    action,
    createdAt: Date.now(),
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

/**
 * Marks a job `FAILED` after the runner throws. Without this, a crashed runner leaves the job at
 * `RUNNING` forever — the client keeps polling a batch that will never progress or complete.
 */
export function failJob(jobId: string): void {
  const job = getStore().jobs.get(jobId);
  if (!job) {
    return;
  }
  job.status = JobStatus.FAILED;
}
