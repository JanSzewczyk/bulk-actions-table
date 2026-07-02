import type { BulkAction, FailureItem } from "./bulk";
import type { Pagination } from "./table-query";

/**
 * Async job model. Progress endpoints return counters — never arrays — so a large N with a high
 * failure rate cannot flood the client. The full failure list is served separately and paginated
 * (`/api/jobs/:id/failures`).
 */

export const JobStatus = {
  COMPLETED: "completed",
  RUNNING: "running"
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** Counters returned by `GET /api/jobs/:id` — polled ~every 1s until `status !== 'running'`. */
export type JobProgress = {
  status: JobStatus;
  total: number;
  processed: number;
  succeeded: number;
  failedCount: number;
};

/** Full job record in the store. `failures` is exposed only via the paginated failures endpoint. */
export type Job = JobProgress & {
  id: string;
  action: BulkAction;
  failures: Array<FailureItem>;
};

/** Response shape of `GET /api/jobs/:id/failures`. */
export type JobFailuresPage = {
  data: Array<FailureItem>;
  pagination: Pagination;
};
