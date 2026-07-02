import "server-only";

import type { TableQuery, TicketsPage } from "~/features/tickets/types/table-query";
import { apiFetch } from "~/lib/api/http-client";
import type { ServiceResult } from "~/lib/services/errors";

/**
 * Fetches a page of tickets from `GET /api/tickets`. The read entry point for RSC pages — it goes
 * over HTTP rather than importing the service, and returns `[error, data]` so the page can render a
 * fallback on failure instead of catching an exception.
 */
export async function getTicketsPage(query: TableQuery): Promise<ServiceResult<TicketsPage>> {
  const params = new URLSearchParams({
    page: String(query.page),
    size: String(query.size)
  });
  if (query.sort !== null) params.set("sort", query.sort);
  if (query.direction !== null) params.set("direction", query.direction);
  if (query.status !== null) params.set("status", query.status);
  if (query.q !== null) params.set("q", query.q);

  return apiFetch<TicketsPage>(`/api/tickets?${params.toString()}`, "Tickets");
}
