import "server-only";

import type { JobProgress } from "~/features/tickets/types/job";
import { apiFetch } from "~/lib/api/http-client";
import type { ServiceResult } from "~/lib/services/errors";

/** Fetches job counters from `GET /api/jobs/:id` — the client's poll target. */
export async function getJobStatus(jobId: string): Promise<ServiceResult<JobProgress>> {
  return apiFetch<JobProgress>(`/api/jobs/${jobId}`, "Job");
}
