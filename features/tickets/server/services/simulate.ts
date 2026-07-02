import "server-only";

/**
 * Per-item latency + failure simulation for the bulk pipeline.
 *
 * Latency is derived from `(seed, ticketId)` so it stays reproducible regardless of the order the
 * worker pool actually processes items in (required since `runPool` runs items concurrently) — it's
 * just simulated timing, not something a user depends on being retry-safe.
 *
 * Failure is a genuinely independent probability draw, deliberately NOT tied to `(seed, ticketId)`.
 * Anchoring it to the id would mean a ticket that failed once fails identically on every future
 * attempt with the same seed — so a batch's failed items could never be retried into success, and
 * the dev panel's failure-rate percentage would stop meaning "probability of failure" and instead
 * mean "which ids are permanently cursed". Each attempt — including retries — gets its own independent
 * roll at the configured rate.
 */

const MIN_LATENCY_MS = 150;
const MAX_LATENCY_MS = 500;

function hashSeed(seed: number, id: string): number {
  let hash = seed >>> 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 2654435761);
    hash ^= hash >>> 13;
  }
  return hash >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG seeded from a 32-bit integer. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic simulated processing delay for one item — same seed + id always waits the same time. */
export function simulateItemLatency(seed: number, id: string): number {
  const rng = mulberry32(hashSeed(seed, id));
  return Math.round(MIN_LATENCY_MS + rng() * (MAX_LATENCY_MS - MIN_LATENCY_MS));
}

/** Independent Bernoulli trial at `failureRate` — a fresh roll every call, so retries can succeed. */
export function rollItemFailure(failureRate: number): boolean {
  return Math.random() < failureRate;
}
