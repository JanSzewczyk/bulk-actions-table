import { z } from "zod";
import { PAGE_SIZE } from "~/features/tickets/constants";
import { SortDirection, type TableQuery, TicketSortField } from "~/features/tickets/types/table-query";
import { TicketStatus } from "~/features/tickets/types/ticket";

/**
 * Parses the table state from URL search params. Every field uses `.catch(...)` so a malformed or
 * hand-edited query string degrades to sensible defaults instead of throwing — the table always
 * renders, and a bad `?page=abc` simply falls back to page 1. `sort`/`direction` are absent from a
 * pristine URL and fall back to `null` (unsorted), not a hidden default sort.
 */
/** `?assigneeIds=u1,u2,unassigned` — a single comma-joined param, since repeated `assigneeIds=` params
 * would collide with `parseTableQuery`'s array-to-first-value normalization below. */
function parseAssigneeIds(value: string): Array<string> {
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export const tableQuerySchema = z.object({
  assigneeIds: z.string().trim().min(1).transform(parseAssigneeIds).nullable().catch(null),
  direction: z.enum(SortDirection).nullable().catch(null),
  page: z.coerce.number().int().positive().catch(1),
  q: z.string().trim().min(1).nullable().catch(null),
  size: z.coerce.number().int().positive().max(200).catch(PAGE_SIZE),
  sort: z.enum(TicketSortField).nullable().catch(null),
  status: z.enum(TicketStatus).nullable().catch(null)
}) satisfies z.ZodType<TableQuery, unknown>;

type SearchParamsInput = Record<string, string | Array<string> | undefined>;

/** Normalizes Next.js `searchParams` (values can be arrays) and parses them into a `TableQuery`. */
export function parseTableQuery(input: SearchParamsInput | URLSearchParams): TableQuery {
  const record: Record<string, string | undefined> =
    input instanceof URLSearchParams
      ? Object.fromEntries(input.entries())
      : Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));

  return tableQuerySchema.parse(record);
}
