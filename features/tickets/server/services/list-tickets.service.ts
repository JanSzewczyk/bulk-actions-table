import "server-only";

import { countIdsOutsideFilter, queryTickets } from "~/features/tickets/server/db";
import type { TableFilter, TableQuery, TicketsPage } from "~/features/tickets/types/table-query";
import type { Ticket, TicketListItem } from "~/features/tickets/types/ticket";

/**
 * Business logic for the ticket list: shapes raw store rows into the client-safe DTO and computes
 * pagination.
 *
 * Lives behind the API boundary — only the `GET /api/tickets` route handler calls it. Pages and
 * server actions reach this data through the HTTP client in `server/api`, never by importing here.
 */

function toListItem(ticket: Ticket): TicketListItem {
  return {
    assigneeId: ticket.assigneeId,
    createdAt: ticket.createdAt,
    customer: ticket.customer,
    id: ticket.id,
    status: ticket.status,
    subject: ticket.subject
  };
}

/** How many of the given ids fall outside the given filter — backs the toolbar's "N outside filter" hint. */
export function countSelectionOutsideFilter(ids: Array<string>, filter: TableFilter): number {
  return countIdsOutsideFilter(ids, filter);
}

export function listTicketsPage(query: TableQuery): TicketsPage {
  const { rows, total } = queryTickets(query);

  return {
    data: rows.map(toListItem),
    pagination: {
      page: query.page,
      size: query.size,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.size))
    }
  };
}
