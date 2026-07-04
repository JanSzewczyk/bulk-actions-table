"use server";

import { getJobStatus } from "~/features/tickets/server/api";
import type { JobProgress } from "~/features/tickets/types/job";
import type { ActionResponse } from "~/lib/action-types";
import { logger } from "./logger";
import { mapServiceError } from "./map-service-error";

/**
 * Poll target for `use-job-polling.tsx`. A read, but the job id it polls only exists in client state
 * (the selection/job that started it), so a server action is the only way to reach it without the
 * client calling the API directly.
 */
export async function pollJobAction(jobId: string): ActionResponse<JobProgress> {
  const [error, progress] = await getJobStatus(jobId);
  if (error) {
    logger.error({ errorCode: error.code, jobId }, "Failed to poll job status");
    return { error: mapServiceError(error), success: false };
  }

  return { data: progress, success: true };
}
