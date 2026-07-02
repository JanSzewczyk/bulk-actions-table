import "server-only";

/**
 * Deterministic per-item latency + failure simulation for the bulk pipeline. The outcome is derived
 * from `(seed, ticketId)` rather than drawn from a single shared PRNG sequence, so it stays
 * reproducible regardless of the order the worker pool actually processes items in — required since
 * `runPool` runs items concurrently.
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

export type SimulatedItemOutcome = {
  latencyMs: number;
  shouldFail: boolean;
};

export function simulateItemOutcome(seed: number, id: string, failureRate: number): SimulatedItemOutcome {
  const rng = mulberry32(hashSeed(seed, id));
  const latencyMs = Math.round(MIN_LATENCY_MS + rng() * (MAX_LATENCY_MS - MIN_LATENCY_MS));
  const shouldFail = rng() < failureRate;
  return { latencyMs, shouldFail };
}
