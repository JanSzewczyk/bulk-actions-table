import "server-only";

import { archiveTicket, assignTicket, restoreTicket, softDeleteTicket } from "~/features/tickets/server/db";
import { BulkAction, FailureReason, type SimulationParams } from "~/features/tickets/types/bulk";
import { ServiceError, type ServiceResult } from "~/lib/services/errors";
import { simulateItemOutcome } from "./simulate";

/**
 * Processes a single ticket through the bulk pipeline: simulated latency, simulated random conflict,
 * then (if neither fires) the real mutation. Shared by the Etap 3 sync path and the Etap 4 async
 * job runner so both produce identical per-item outcomes for the same `(seed, id)`.
 */

export type BulkItemOutcome = { id: string; success: true } | { id: string; reason: FailureReason; success: false };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function applyMutation(id: string, action: BulkAction, assigneeId: string | undefined): ServiceResult<void> {
  switch (action) {
    case BulkAction.ARCHIVE:
      return archiveTicket(id);
    case BulkAction.ASSIGN:
      return assignTicket(id, assigneeId as string);
    case BulkAction.DELETE:
      return softDeleteTicket(id);
    case BulkAction.RESTORE:
      return restoreTicket(id);
    default:
      return [ServiceError.internal("BulkAction", "Unknown action"), null];
  }
}

export async function processBulkItem(
  id: string,
  action: BulkAction,
  assigneeId: string | undefined,
  params: SimulationParams
): Promise<BulkItemOutcome> {
  const { latencyMs, shouldFail } = simulateItemOutcome(params.seed, id, params.failureRate);
  await sleep(latencyMs);

  if (shouldFail) {
    return { id, reason: FailureReason.CONFLICT, success: false };
  }

  const [error] = applyMutation(id, action, assigneeId);
  if (error) {
    return { id, reason: error.isNotFound ? FailureReason.NOT_FOUND : FailureReason.UNKNOWN, success: false };
  }
  return { id, success: true };
}
