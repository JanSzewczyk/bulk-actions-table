import "server-only";

import type { BulkActionOutcome, BulkRequest } from "~/features/tickets/types/bulk";
import { getBaseUrl } from "~/lib/api/http-client";
import { createLogger } from "~/lib/logger";
import { categorizeServiceError, type ServiceResult, serviceErrorFromStatus } from "~/lib/services/errors";

const logger = createLogger({ module: "api-client" });

/**
 * Posts a bulk action to `POST /api/tickets/bulk`. Kept separate from the generic `apiFetch` because
 * this endpoint's success shape depends on the status code (`200` sync vs `202` async) — the
 * single-shape `apiFetch<T>` can't express that without complicating every other call site.
 */
export async function postBulkAction(
  request: BulkRequest,
  idempotencyKey: string
): Promise<ServiceResult<BulkActionOutcome>> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/tickets/bulk`, {
      body: JSON.stringify(request),
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      method: "POST"
    });

    if (!response.ok) {
      const error = serviceErrorFromStatus(response.status, "BulkAction");
      logger.error({ errorCode: error.code, status: response.status }, "Bulk action request failed");
      return [error, null];
    }

    const data = (await response.json()) as BulkActionOutcome;
    return [null, data];
  } catch (caught) {
    const error = categorizeServiceError(caught, "BulkAction");
    logger.error({ errorCode: error.code, isRetryable: error.isRetryable }, "Bulk action request threw");
    return [error, null];
  }
}
