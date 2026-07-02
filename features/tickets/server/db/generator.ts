import "server-only";

import { faker } from "@faker-js/faker";
import { seed } from "mimicry-js";
import { CURRENT_USER_ID } from "~/features/tickets/constants";
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

  // Static teammate simulating the current user, shown as "(You)" in the assign picker. Built here
  // (not as a module constant) so its avatar comes from the same seeded faker stream as everything else.
  const currentUser: Teammate = {
    avatarUrl: faker.image.avatarGitHub(),
    email: "me@example.com",
    id: CURRENT_USER_ID,
    isAvailable: true,
    name: "Me"
  };

  teammateBuilder.reset();
  const teammates = [currentUser, ...teammateBuilder.many(TEAMMATE_COUNT)];
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
