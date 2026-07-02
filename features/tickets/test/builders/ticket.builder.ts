import { faker } from "@faker-js/faker";
import { build, sequence } from "mimicry-js";
import { type Ticket, TicketStatus } from "~/features/tickets/types/ticket";

/**
 * Factory for {@link Ticket} — the raw store record backing the bulk-actions table.
 *
 * Deterministic when seeded first (`faker.seed(n)` + `seed(n)` from mimicry-js) so the whole ~8k
 * dataset reproduces identically after a server restart. Dates use a fixed `from`/`to` window
 * (never `Date.now()`) so generation does not depend on wall-clock time.
 *
 * `assigneeId` defaults to `null` — the dataset generator assigns real teammate ids afterwards
 * (it owns the teammate list), keeping this builder decoupled from teammate count.
 *
 * @example
 * ticketBuilder.reset();
 * const tickets = ticketBuilder.many(8000);         // t1..t8000
 * ticketBuilder.one({ traits: "archived" });
 */

const SUBJECT_PREFIXES = [
  "Nie działa logowanie",
  "Błąd płatności",
  "Prośba o zwrot środków",
  "Problem z fakturą",
  "Konto zostało zablokowane",
  "Nie otrzymałem wiadomości e-mail",
  "Awaria integracji API",
  "Pytanie o subskrypcję",
  "Reklamacja zamówienia",
  "Zmiana danych rozliczeniowych",
  "Eksport danych nie działa",
  "Powiadomienia nie przychodzą",
  "Prośba o zwiększenie limitu",
  "Błąd 500 na stronie płatności",
  "Nie mogę zresetować hasła"
];

const CREATED_FROM = "2024-01-01T00:00:00.000Z";
const CREATED_TO = "2025-06-30T23:59:59.999Z";

export const ticketBuilder = build<Ticket>({
  fields: {
    assigneeId: null,
    createdAt: () => faker.date.between({ from: CREATED_FROM, to: CREATED_TO }).toISOString(),
    customer: () => faker.company.name(),
    deletedAt: null,
    id: sequence((n) => `t${n}`),
    status: () =>
      faker.helpers.weightedArrayElement([
        { value: TicketStatus.OPEN, weight: 5 },
        { value: TicketStatus.PENDING, weight: 3 },
        { value: TicketStatus.RESOLVED, weight: 3 },
        { value: TicketStatus.CLOSED, weight: 2 },
        { value: TicketStatus.ARCHIVED, weight: 1 }
      ]),
    subject: () => `${faker.helpers.arrayElement(SUBJECT_PREFIXES)} (#${faker.number.int({ max: 99999, min: 1000 })})`
  },
  traits: {
    archived: { overrides: { status: TicketStatus.ARCHIVED } },
    deleted: { overrides: { deletedAt: () => new Date("2025-07-01T00:00:00.000Z").toISOString() } },
    open: { overrides: { status: TicketStatus.OPEN } }
  }
});
