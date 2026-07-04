"use server";

import { getTicketsPage } from "~/features/tickets/server/api";
import type { TableFilter } from "~/features/tickets/types/table-query";
import type { ActionResponse } from "~/lib/action-types";
import { logger } from "./logger";
import { mapServiceError } from "./map-service-error";

/**
 * Re-counts how many tickets currently match `filter`, fetched fresh over `GET /api/tickets` (page
 * size 1 — only `pagination.total` is needed). The `all`-mode confirmation dialog calls this right
 * before it opens instead of trusting the `total` prop, which is a snapshot from the last RSC render
 * and can go stale between that render and the click (another tab mutating data, or a still-running
 * async job changing the matching set).
 */
export async function refreshMatchingCountAction(filter: TableFilter): ActionResponse<number> {
  const [error, page] = await getTicketsPage({
    ...filter,
    direction: null,
    page: 1,
    size: 1,
    sort: null
  });
  if (error) {
    logger.error({ errorCode: error.code }, "Failed to refresh matching count");
    return { error: mapServiceError(error), success: false };
  }

  return { data: page.pagination.total, success: true };
}
