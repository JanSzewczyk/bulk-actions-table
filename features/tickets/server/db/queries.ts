import "server-only";

import type { FailureItem } from "~/features/tickets/types/bulk";
import type { Job } from "~/features/tickets/types/job";
import type { TableFilter, TableQuery, TicketSortField } from "~/features/tickets/types/table-query";
import type { Teammate } from "~/features/tickets/types/teammate";
import type { Ticket } from "~/features/tickets/types/ticket";
import { getStore } from "./store";

/**
 * Raw reads over the in-memory store. These return plain values (not a `[error, data]` tuple):
 * reading a `Map` cannot fail, so an error channel here would be dead weight. Mutations, which can
 * partially fail, use the tuple contract instead.
 */

/** A ticket is visible in the list unless it has been soft-deleted. */
function isVisible(ticket: Ticket): boolean {
  return ticket.deletedAt === null;
}

function matchesFilter(ticket: Ticket, filter: TableFilter): boolean {
  if (!isVisible(ticket)) {
    return false;
  }
  if (filter.status !== null && ticket.status !== filter.status) {
    return false;
  }
  if (filter.q !== null) {
    const needle = filter.q.toLowerCase();
    const haystack = `${ticket.subject} ${ticket.customer}`.toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }
  return true;
}

const comparators: Record<TicketSortField, (a: Ticket, b: Ticket) => number> = {
  createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
  status: (a, b) => a.status.localeCompare(b.status),
  subject: (a, b) => a.subject.localeCompare(b.subject)
};

function collectMatching(filter: TableFilter): Array<Ticket> {
  const { tickets } = getStore();
  const matching: Array<Ticket> = [];
  for (const ticket of tickets.values()) {
    if (matchesFilter(ticket, filter)) {
      matching.push(ticket);
    }
  }
  return matching;
}

/** Filter → sort → paginate. `total` is the count of all matching rows (needed for "select all N"). */
export function queryTickets(query: TableQuery): { rows: Array<Ticket>; total: number } {
  const matching = collectMatching(query);

  // `sort: null` is the genuine unsorted state (third click of the header cycle) — leave the store's
  // natural order alone instead of imposing a hidden default.
  if (query.sort !== null) {
    const compare = comparators[query.sort];
    matching.sort((a, b) => {
      const primary = query.direction === "asc" ? compare(a, b) : compare(b, a);
      // Stable tie-break by id so equal keys keep a deterministic order across requests.
      return primary !== 0 ? primary : a.id.localeCompare(b.id);
    });
  }

  const total = matching.length;
  const offset = (query.page - 1) * query.size;
  const rows = matching.slice(offset, offset + query.size);
  return { rows, total };
}

/** All ids matching a filter — used to resolve a `mode: 'all'` selection into concrete targets. */
export function getMatchingTicketIds(filter: TableFilter): Array<string> {
  return collectMatching(filter).map((ticket) => ticket.id);
}

/** Count of rows matching a filter, without materializing a page. */
export function countMatching(filter: TableFilter): number {
  return collectMatching(filter).length;
}

/** Of the given ids, how many no longer match `filter` (or were deleted) — drives the toolbar's hint. */
export function countIdsOutsideFilter(ids: ReadonlyArray<string>, filter: TableFilter): number {
  const { tickets } = getStore();
  let outside = 0;
  for (const id of ids) {
    const ticket = tickets.get(id);
    if (!ticket || !matchesFilter(ticket, filter)) {
      outside += 1;
    }
  }
  return outside;
}

export function getTicketById(id: string): Ticket | undefined {
  return getStore().tickets.get(id);
}

export function getTeammates(): Array<Teammate> {
  return getStore().teammates;
}

export function getJobById(id: string): Job | undefined {
  return getStore().jobs.get(id);
}

/** A page of a job's failures, plus the total count for pagination — never the full list at once. */
export function getJobFailuresPage(
  id: string,
  page: number,
  size: number
): { data: Array<FailureItem>; total: number } {
  const job = getStore().jobs.get(id);
  if (!job) {
    return { data: [], total: 0 };
  }
  const offset = (page - 1) * size;
  return { data: job.failures.slice(offset, offset + size), total: job.failures.length };
}
