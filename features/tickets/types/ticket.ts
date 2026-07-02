/**
 * A support ticket — the domain entity of the bulk-actions table.
 *
 * `Ticket` is the raw record held in the in-memory store (server-only). `TicketListItem` is the
 * client-safe DTO returned to the table (assignee resolved to `{ id, name }`, no soft-delete field).
 */

export const TicketStatus = {
  ARCHIVED: "ARCHIVED",
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  PENDING: "PENDING",
  RESOLVED: "RESOLVED"
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketStatuses = Object.values(TicketStatus) as Array<TicketStatus>;

/** Raw store record. `createdAt` is an ISO string so it serializes and sorts lexicographically. */
export type Ticket = {
  id: string;
  subject: string;
  customer: string;
  status: TicketStatus;
  assigneeId: string | null;
  createdAt: string;
  /** Soft-delete marker: non-null hides the ticket from the list but keeps it restorable until finalized. */
  deletedAt: string | null;
};

/**
 * Client-safe row shown in the table (soft-delete detail dropped). Carries only the assignee's id —
 * never a denormalized name/avatar — so the client resolves it against the `teammates` list it
 * already has, instead of the server duplicating teammate data into every row.
 */
export type TicketListItem = {
  id: string;
  subject: string;
  customer: string;
  status: TicketStatus;
  assigneeId: string | null;
  createdAt: string;
};
