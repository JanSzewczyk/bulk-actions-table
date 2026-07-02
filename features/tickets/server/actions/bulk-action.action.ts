"use server";

import { postBulkAction } from "~/features/tickets/server/api";
import type { BulkActionOutcome, BulkRequest } from "~/features/tickets/types/bulk";
import type { ActionResponse } from "~/lib/action-types";
import { logger } from "./logger";
import { mapServiceError } from "./map-service-error";

/**
 * Client entry point for `POST /api/tickets/bulk`. Passed as a prop from the page down to the client
 * toolbar (client components never import from `server/` directly) — the caller drives the resulting
 * `router.refresh()` since the client also owns the selection state that needs updating on success.
 */
export async function bulkActionAction(
  request: BulkRequest,
  idempotencyKey: string
): ActionResponse<BulkActionOutcome> {
  const [error, outcome] = await postBulkAction(request, idempotencyKey);
  if (error) {
    logger.error({ action: request.action, errorCode: error.code }, "Bulk action request failed");
    return { error: mapServiceError(error), success: false };
  }

  return { data: outcome, success: true };
}
