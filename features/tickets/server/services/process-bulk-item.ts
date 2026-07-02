import "server-only";

import {
  archiveTicket,
  assignTicket,
  restoreTicket,
  softDeleteTicket,
  unassignTicket
} from "~/features/tickets/server/db";
import { BulkAction, FailureReason, type SimulationParams } from "~/features/tickets/types/bulk";
import { ServiceError, type ServiceResult } from "~/lib/services/errors";
import { rollItemFailure, simulateItemLatency } from "./simulate";

/**
 * Processes a single ticket through the bulk pipeline: simulated latency, an independent
 * probability roll for a simulated conflict, then (if neither fires) the real mutation. Shared by
 * the sync path and the async job runner, so both behave identically. The failure roll is
 * deliberately fresh every call — a ticket that failed once is not doomed to fail forever, so
 * retrying a partially-failed batch can actually succeed.
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
    case BulkAction.UNASSIGN:
      return unassignTicket(id);
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
  const latencyMs = simulateItemLatency(params.seed, id);
  await sleep(latencyMs);

  if (rollItemFailure(params.failureRate)) {
    return { id, reason: FailureReason.CONFLICT, success: false };
  }

  const [error] = applyMutation(id, action, assigneeId);
  if (error) {
    return { id, reason: error.isNotFound ? FailureReason.NOT_FOUND : FailureReason.UNKNOWN, success: false };
  }
  return { id, success: true };
}
