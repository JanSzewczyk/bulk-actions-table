import "server-only";

import { env } from "~/data/env/server";
import {
  createJob,
  getIdempotentResult,
  getMatchingTicketIds,
  getSimulationParams,
  getTeammates,
  recordIdempotentResult
} from "~/features/tickets/server/db";
import { BulkAction, type BulkActionOutcome, type BulkRequest, type BulkResult } from "~/features/tickets/types/bulk";
import { createLogger } from "~/lib/logger";
import { ServiceError, type ServiceResult } from "~/lib/services/errors";
import { runJob } from "./job-runner";
import { processBulkItem } from "./process-bulk-item";
import { runPool } from "./throttle";

const logger = createLogger({ module: "tickets-bulk-service" });

/**
 * Resolves the request's target ids, validates the `assign` contract up front (a bad `assigneeId` is
 * a 400, not a per-item failure), then either runs the batch synchronously or escalates to an async
 * job when the selection is `mode: 'all'` or crosses `BULK_ASYNC_THRESHOLD`. Idempotency-keyed so a
 * retried submit returns the original outcome instead of re-executing.
 */

function resolveTargetIds(request: BulkRequest): Array<string> {
  if (request.mode === "include") {
    return request.ids;
  }
  const excluded = new Set(request.excluded);
  return getMatchingTicketIds(request.filter).filter((id) => !excluded.has(id));
}

function validateAssignee(request: BulkRequest): ServiceError | null {
  if (request.action !== BulkAction.ASSIGN) {
    return null;
  }
  const isKnownTeammate = getTeammates().some((teammate) => teammate.id === request.assigneeId);
  return isKnownTeammate ? null : ServiceError.validation("assigneeId does not match a known teammate");
}

export async function executeBulkAction(
  request: BulkRequest,
  idempotencyKey: string
): Promise<ServiceResult<BulkActionOutcome>> {
  const cached = getIdempotentResult(idempotencyKey);
  if (cached) {
    return [null, cached];
  }

  const assigneeError = validateAssignee(request);
  if (assigneeError) {
    return [assigneeError, null];
  }

  const targetIds = resolveTargetIds(request);
  const isAsync = request.mode === "all" || targetIds.length >= env.BULK_ASYNC_THRESHOLD;

  // Read once per request — a mid-batch dev-panel change must not alter an already-running batch.
  const simulation = getSimulationParams();

  if (isAsync) {
    const jobId = createJob(request.action, targetIds.length);
    const outcome: BulkActionOutcome = { jobId, mode: "async", total: targetIds.length };
    recordIdempotentResult(idempotencyKey, outcome);

    // Fire-and-forget: the route must respond `202` immediately, not wait for the batch to finish.
    void runJob(jobId, targetIds, request.action, request.assigneeId, simulation).catch((caught: unknown) => {
      logger.error(
        { action: request.action, error: caught instanceof Error ? caught.message : String(caught), jobId },
        "Background job crashed"
      );
    });

    return [null, outcome];
  }

  const outcomes = await runPool(targetIds, simulation.concurrency, (id) =>
    processBulkItem(id, request.action, request.assigneeId, simulation)
  );

  const result: BulkResult = { failed: [], succeeded: [] };
  for (const item of outcomes) {
    if (item.success) {
      result.succeeded.push(item.id);
    } else {
      result.failed.push({ id: item.id, reason: item.reason });
    }
  }

  const outcome: BulkActionOutcome = { mode: "sync", result };
  recordIdempotentResult(idempotencyKey, outcome);
  return [null, outcome];
}
