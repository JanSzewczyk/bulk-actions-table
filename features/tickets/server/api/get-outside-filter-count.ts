import "server-only";

import type { TableFilter } from "~/features/tickets/types/table-query";
import { apiFetch } from "~/lib/api/http-client";
import type { ServiceResult } from "~/lib/services/errors";

/** Fetches how many of the given ids fall outside `filter` from `POST /api/tickets/outside-filter-count`. */
export async function getOutsideFilterCount(ids: Array<string>, filter: TableFilter): Promise<ServiceResult<number>> {
  const [error, data] = await apiFetch<{ count: number }>("/api/tickets/outside-filter-count", "OutsideFilterCount", {
    body: JSON.stringify({ filter, ids }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  if (error) {
    return [error, null];
  }
  return [null, data.count];
}
