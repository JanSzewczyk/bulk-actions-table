import "server-only";

import { env } from "~/data/env/server";
import {
  createJob,
  getIdempotentResult,
  getMatchingTicketIds,
  getTeammates,
  recordIdempotentResult
} from "~/features/tickets/server/db";
import { BulkAction, type BulkActionOutcome, type BulkRequest, type BulkResult } from "~/features/tickets/types/bulk";
import { ServiceError, type ServiceResult } from "~/lib/services/errors";
import { processBulkItem } from "./process-bulk-item";
import { runPool } from "./throttle";

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

  if (isAsync) {
    const jobId = createJob(request.action, targetIds.length);
    const outcome: BulkActionOutcome = { jobId, mode: "async", total: targetIds.length };
    recordIdempotentResult(idempotencyKey, outcome);
    return [null, outcome];
  }

  const outcomes = await runPool(targetIds, request.concurrency, (id) =>
    processBulkItem(id, request.action, request.assigneeId, request)
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
