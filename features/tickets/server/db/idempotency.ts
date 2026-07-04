import "server-only";

import type { BulkActionOutcome } from "~/features/tickets/types/bulk";
import { getStore, type IdempotencyEntry } from "./store";

/**
 * Caches a bulk request's outcome by its `Idempotency-Key` header, so a retried or double-clicked
 * submit returns the original result instead of re-executing the batch.
 *
 * Entries carry a timestamp and are swept on write. In practice every client submit mints a fresh
 * `crypto.randomUUID()` key (see `tickets-table-section.tsx`), so a cache hit only ever happens for a
 * genuinely duplicated network request within the same short window — without a TTL, this map would
 * otherwise grow by one entry per submit for the life of the process.
 */
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

function evictExpired(entries: Map<string, IdempotencyEntry>): void {
  const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
  for (const [key, entry] of entries) {
    if (entry.createdAt < cutoff) {
      entries.delete(key);
    }
  }
}

export function getIdempotentResult(key: string): BulkActionOutcome | undefined {
  return getStore().idempotency.get(key)?.outcome;
}

export function recordIdempotentResult(key: string, outcome: BulkActionOutcome): void {
  const { idempotency } = getStore();
  evictExpired(idempotency);
  idempotency.set(key, { createdAt: Date.now(), outcome });
}
