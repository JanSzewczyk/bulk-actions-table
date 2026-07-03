import "server-only";

import { finalizeJob, getJobById, recordJobFailure, recordJobSuccess } from "~/features/tickets/server/db";
import type { BulkAction, SimulationParams } from "~/features/tickets/types/bulk";
import { createLogger } from "~/lib/logger";
import { processBulkItem } from "./process-bulk-item";
import { runPool } from "./throttle";

const logger = createLogger({ module: "tickets-job-runner" });

/**
 * Background async-job processing — fire-and-forget from `bulk-service.ts`. Reuses the exact same
 * per-item pipeline (`processBulkItem` + `runPool`) as the sync path, so a batch produces the same
 * outcome whether it ran inline or as a job. Progress is written straight to the store; the client
 * only ever sees it through the polled `GET /api/jobs/:id` counters.
 */
export async function runJob(
  jobId: string,
  ids: Array<string>,
  action: BulkAction,
  assigneeId: string | undefined,
  simulation: SimulationParams
): Promise<void> {
  await runPool(ids, simulation.concurrency, async (id) => {
    const outcome = await processBulkItem(id, action, assigneeId, simulation);
    if (outcome.success) {
      recordJobSuccess(jobId);
    } else {
      recordJobFailure(jobId, outcome.id, outcome.reason);
    }
  });

  finalizeJob(jobId);

  const job = getJobById(jobId);
  logger.info(
    { action, failedCount: job?.failedCount, jobId, succeeded: job?.succeeded, total: job?.total },
    "Job completed"
  );
}
