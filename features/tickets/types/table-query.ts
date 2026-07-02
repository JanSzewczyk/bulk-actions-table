import type { TicketListItem, TicketStatus } from "./ticket";

/**
 * Table state carried in the URL: page, size, sort, status filter, search. Parsed from `searchParams`
 * by `schemas/table-query-schema.ts` and consumed by the server read layer.
 */

export const SortDirection = {
  ASC: "asc",
  DESC: "desc"
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

export const TicketSortField = {
  CREATED_AT: "createdAt",
  STATUS: "status",
  SUBJECT: "subject"
} as const;

export type TicketSortField = (typeof TicketSortField)[keyof typeof TicketSortField];

/** The filter subset that also defines the scope of a `mode: 'all'` selection. */
export type TableFilter = {
  status: TicketStatus | null;
  q: string | null;
};

export type TableQuery = TableFilter & {
  page: number;
  size: number;
  /** `null` means unsorted (the third click of the header cycle: asc → desc → off). */
  sort: TicketSortField | null;
  direction: SortDirection | null;
};

export type Pagination = {
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

/** Result of a list read — the shape of `GET /api/tickets`. */
export type TicketsPage = {
  data: Array<TicketListItem>;
  pagination: Pagination;
};
