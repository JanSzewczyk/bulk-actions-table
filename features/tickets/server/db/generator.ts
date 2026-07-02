import "server-only";

import { faker } from "@faker-js/faker";
import { seed } from "mimicry-js";
import { teammateBuilder, ticketBuilder } from "~/features/tickets/test/builders";
import type { Teammate } from "~/features/tickets/types/teammate";
import type { Ticket } from "~/features/tickets/types/ticket";

/**
 * Deterministic dataset generator for the in-memory mock.
 *
 * Seeding both `faker` and mimicry-js up front means the same `seed` reproduces the identical
 * ~8k-ticket dataset after every server restart — the demo is repeatable, and the "restart = reset"
 * behaviour is intentional, not a bug.
 *
 * Uses the shared `ticket`/`teammate` builders as the single source of shape, so the seed data and
 * any test/story fixtures stay in sync.
 */

const TEAMMATE_COUNT = 8;
const ASSIGNED_PROBABILITY = 0.7;

export function generateDataset({ seed: seedValue, size }: { seed: number; size: number }): {
  tickets: Array<Ticket>;
  teammates: Array<Teammate>;
} {
  faker.seed(seedValue);
  seed(seedValue);

  teammateBuilder.reset();
  const teammates = teammateBuilder.many(TEAMMATE_COUNT);
  const teammateIds = teammates.map((teammate) => teammate.id);

  ticketBuilder.reset();
  const tickets = ticketBuilder.many(size);

  // Assign ~70% of tickets to a real teammate. Runs on the seeded faker stream, so the assignment
  // is part of the deterministic dataset. The builder stays decoupled from the teammate list.
  for (const ticket of tickets) {
    ticket.assigneeId =
      faker.helpers.maybe(() => faker.helpers.arrayElement(teammateIds), { probability: ASSIGNED_PROBABILITY }) ?? null;
  }

  return { teammates, tickets };
}
