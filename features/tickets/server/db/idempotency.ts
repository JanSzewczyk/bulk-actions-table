import "server-only";

import type { BulkActionOutcome } from "~/features/tickets/types/bulk";
import { getStore } from "./store";

/**
 * Caches a bulk request's outcome by its `Idempotency-Key` header, so a retried or double-clicked
 * submit returns the original result instead of re-executing the batch.
 */

export function getIdempotentResult(key: string): BulkActionOutcome | undefined {
  return getStore().idempotency.get(key);
}

export function recordIdempotentResult(key: string, outcome: BulkActionOutcome): void {
  getStore().idempotency.set(key, outcome);
}
