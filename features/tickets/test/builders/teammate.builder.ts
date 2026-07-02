import { faker } from "@faker-js/faker";
import { build, sequence } from "mimicry-js";
import type { Teammate } from "~/features/tickets/types/teammate";

/**
 * Factory for {@link Teammate} — the "Assign to…" picker source.
 *
 * Deterministic when the caller seeds first: `faker.seed(n)` controls the arrow-function fields
 * (name, email, avatar) and `seed(n)` from mimicry-js controls generators. `id` runs `u1`, `u2`, …
 * so seed data is stable and matches the `assigneeId` values a ticket can hold.
 *
 * @example
 * teammateBuilder.reset();
 * const teammates = teammateBuilder.many(8);          // u1..u8
 * teammateBuilder.one({ traits: "unavailable" });     // isAvailable = false
 */
export const teammateBuilder = build<Teammate>({
  fields: {
    avatarUrl: () => faker.image.avatarGitHub(),
    email: () => faker.internet.email().toLowerCase(),
    id: sequence((n) => `u${n}`),
    // Most teammates are available; the picker dims the rest.
    isAvailable: () => faker.datatype.boolean({ probability: 0.7 }),
    name: () => faker.person.fullName()
  },
  traits: {
    available: { overrides: { isAvailable: true } },
    unavailable: { overrides: { isAvailable: false } }
  }
});
