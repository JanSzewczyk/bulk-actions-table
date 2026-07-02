import "server-only";

import { env } from "~/data/env/server";
import { DEFAULT_CONCURRENCY, DEFAULT_FAILURE_RATE, DEFAULT_SEED } from "~/features/tickets/constants";
import type { BulkActionOutcome, SimulationParams } from "~/features/tickets/types/bulk";
import type { Job } from "~/features/tickets/types/job";
import type { Teammate } from "~/features/tickets/types/teammate";
import type { Ticket } from "~/features/tickets/types/ticket";
import { generateDataset } from "./generator";

/**
 * In-memory data store for the mock backend.
 *
 * The store is a singleton pinned to `globalThis` so it survives dev hot-reloads (a plain module
 * variable would be re-initialized on every reload and wipe the data). It holds one Node process'
 * worth of state: the ticket map, the teammate list, and the async-job registry.
 *
 * Restarting the server resets the data on purpose — the dataset is regenerated from a fixed seed,
 * so it comes back identical every time. The production path would swap this for a persistent store
 * plus a queue and worker; the API contract stays the same.
 */

type TicketStore = {
  tickets: Map<string, Ticket>;
  teammates: Array<Teammate>;
  jobs: Map<string, Job>;
  /** Bulk request outcomes keyed by `Idempotency-Key`, so a retried submit isn't re-executed. */
  idempotency: Map<string, BulkActionOutcome>;
  /** Server-side simulation knobs, tunable at runtime via `GET`/`PATCH /api/dev/simulation`. */
  simulation: SimulationParams;
};

const STORE_KEY = Symbol.for("bulk-actions-table.tickets-store");

type GlobalWithStore = typeof globalThis & {
  [STORE_KEY]?: TicketStore;
};

function createStore(): TicketStore {
  const { tickets, teammates } = generateDataset({ seed: env.DATASET_SEED, size: env.DATASET_SIZE });
  const ticketMap = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const simulation: SimulationParams = {
    concurrency: DEFAULT_CONCURRENCY,
    failureRate: DEFAULT_FAILURE_RATE,
    seed: DEFAULT_SEED
  };
  return { idempotency: new Map(), jobs: new Map(), simulation, teammates, tickets: ticketMap };
}

/** Returns the process-wide store, generating the dataset lazily on first access. */
export function getStore(): TicketStore {
  const globalWithStore = globalThis as GlobalWithStore;
  globalWithStore[STORE_KEY] ??= createStore();
  return globalWithStore[STORE_KEY];
}
