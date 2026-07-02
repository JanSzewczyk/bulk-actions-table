import "server-only";

import { getTeammates, queryTickets } from "~/features/tickets/server/db";
import type { TableQuery, TicketsPage } from "~/features/tickets/types/table-query";
import type { Teammate } from "~/features/tickets/types/teammate";
import type { Ticket, TicketListItem } from "~/features/tickets/types/ticket";

/**
 * Business logic for the ticket list: shapes raw store rows into the client-safe DTO (resolving the
 * assignee id to a name) and computes pagination.
 *
 * Lives behind the API boundary — only the `GET /api/tickets` route handler calls it. Pages and
 * server actions reach this data through the HTTP client in `server/api`, never by importing here.
 */

function toListItem(ticket: Ticket, teammateById: Map<string, Teammate>): TicketListItem {
  const teammate = ticket.assigneeId === null ? undefined : teammateById.get(ticket.assigneeId);

  return {
    assignee:
      ticket.assigneeId === null
        ? null
        : { avatarUrl: teammate?.avatarUrl ?? null, id: ticket.assigneeId, name: teammate?.name ?? "Unknown" },
    createdAt: ticket.createdAt,
    customer: ticket.customer,
    id: ticket.id,
    status: ticket.status,
    subject: ticket.subject
  };
}

export function listTicketsPage(query: TableQuery): TicketsPage {
  const teammateById = new Map(getTeammates().map((teammate) => [teammate.id, teammate]));
  const { rows, total } = queryTickets(query);

  return {
    data: rows.map((row) => toListItem(row, teammateById)),
    pagination: {
      page: query.page,
      size: query.size,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.size))
    }
  };
}
