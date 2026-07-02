import "server-only";

import { getJobById, getJobFailuresPage } from "~/features/tickets/server/db";
import type { JobFailuresPage, JobProgress } from "~/features/tickets/types/job";

/**
 * Counters only — never the failure list itself. This is what `GET /api/jobs/:id` serves, so a large
 * batch with a high failure rate can't flood the client through the polling loop.
 */
export function readJobStatus(id: string): JobProgress | undefined {
  const job = getJobById(id);
  if (!job) {
    return undefined;
  }
  const { status, total, processed, succeeded, failedCount } = job;
  return { failedCount, processed, status, succeeded, total };
}

/** Paginated failure list — the only way to see individual failed ids for a job. */
export function readJobFailures(id: string, page: number, size: number): JobFailuresPage {
  const { data, total } = getJobFailuresPage(id, page, size);
  return {
    data,
    pagination: { page, size, total, totalPages: Math.max(1, Math.ceil(total / size)) }
  };
}
