import "server-only";

import type { JobFailuresPage } from "~/features/tickets/types/job";
import { apiFetch } from "~/lib/api/http-client";
import type { ServiceResult } from "~/lib/services/errors";

/** Fetches one page of a job's failures from `GET /api/jobs/:id/failures?page&size`. */
export async function getJobFailures(
  jobId: string,
  page: number,
  size: number
): Promise<ServiceResult<JobFailuresPage>> {
  return apiFetch<JobFailuresPage>(`/api/jobs/${jobId}/failures?page=${page}&size=${size}`, "JobFailures");
}
