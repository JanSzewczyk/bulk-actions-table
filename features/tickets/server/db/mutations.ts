import "server-only";

import type { Ticket } from "~/features/tickets/types/ticket";
import { TicketStatus } from "~/features/tickets/types/ticket";
import { ServiceError, type ServiceResult } from "~/lib/services/errors";
import { getStore } from "./store";

/**
 * Per-ticket mutations against the in-memory store. Each targets exactly one ticket and returns
 * `ServiceResult<void>` — a dead or already-deleted id becomes `ServiceError.notFound()`, which the
 * bulk processor turns into a per-item `failed: not_found` rather than aborting the whole batch.
 */

function requireVisibleTicket(id: string): ServiceResult<Ticket> {
  const ticket = getStore().tickets.get(id);
  if (!ticket || ticket.deletedAt !== null) {
    return [ServiceError.notFound("Ticket"), null];
  }
  return [null, ticket];
}

function requireDeletedTicket(id: string): ServiceResult<Ticket> {
  const ticket = getStore().tickets.get(id);
  if (!ticket || ticket.deletedAt === null) {
    return [ServiceError.notFound("Ticket"), null];
  }
  return [null, ticket];
}

export function archiveTicket(id: string): ServiceResult<void> {
  const [error, ticket] = requireVisibleTicket(id);
  if (error) return [error, null];
  ticket.status = TicketStatus.ARCHIVED;
  return [null, undefined];
}

export function assignTicket(id: string, assigneeId: string): ServiceResult<void> {
  const [error, ticket] = requireVisibleTicket(id);
  if (error) return [error, null];
  ticket.assigneeId = assigneeId;
  return [null, undefined];
}

export function softDeleteTicket(id: string): ServiceResult<void> {
  const [error, ticket] = requireVisibleTicket(id);
  if (error) return [error, null];
  ticket.deletedAt = new Date().toISOString();
  return [null, undefined];
}

export function restoreTicket(id: string): ServiceResult<void> {
  const [error, ticket] = requireDeletedTicket(id);
  if (error) return [error, null];
  ticket.deletedAt = null;
  return [null, undefined];
}
