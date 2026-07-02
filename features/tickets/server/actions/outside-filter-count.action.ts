"use server";

import { getOutsideFilterCount } from "~/features/tickets/server/api";
import type { TableFilter } from "~/features/tickets/types/table-query";
import type { ActionResponse } from "~/lib/action-types";
import { logger } from "./logger";
import { mapServiceError } from "./map-service-error";

/**
 * Backs the toolbar's "(N outside current filter)" hint. This is a read, but the selection it reads
 * against lives only in client state, so a server action (rather than an RSC re-render) is the only
 * way to reach it without the client calling the API directly.
 */
export async function outsideFilterCountAction(ids: Array<string>, filter: TableFilter): ActionResponse<number> {
  if (ids.length === 0) {
    return { data: 0, success: true };
  }

  const [error, count] = await getOutsideFilterCount(ids, filter);
  if (error) {
    logger.error({ errorCode: error.code }, "Failed to compute outside-filter count");
    return { error: mapServiceError(error), success: false };
  }

  return { data: count, success: true };
}
