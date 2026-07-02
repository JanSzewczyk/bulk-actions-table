import { type NextRequest, NextResponse } from "next/server";
import { parseBulkRequest } from "~/features/tickets/schemas";
import { executeBulkAction } from "~/features/tickets/server/services";
import { createLogger } from "~/lib/logger";
import { httpStatusFromServiceError } from "~/lib/services/errors";

// The store mutates in-memory, so a bulk request must never be cached — always execute fresh.
export const dynamic = "force-dynamic";

const logger = createLogger({ module: "api-tickets-bulk" });

/**
 * `POST /api/tickets/bulk`
 *
 * Dual response contract: `200 { succeeded, failed }` when the batch runs synchronously, `202
 * { jobId, status, total }` when the selection escalates to an async job (`mode: 'all'` or the item
 * count crosses `BULK_ASYNC_THRESHOLD`). Requires an `Idempotency-Key` header so a double-submit
 * returns the original outcome instead of re-executing.
 */
export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Missing Idempotency-Key header" }, { status: 400 });
  }

  let body: ReturnType<typeof parseBulkRequest>;
  try {
    body = parseBulkRequest(await request.json());
  } catch {
    logger.warn({ idempotencyKey }, "Rejected invalid bulk request payload");
    return NextResponse.json({ error: "Invalid bulk request payload" }, { status: 400 });
  }

  const [error, outcome] = await executeBulkAction(body, idempotencyKey);
  if (error) {
    logger.error({ action: body.action, errorCode: error.code }, "Bulk action failed");
    return NextResponse.json({ error: error.message }, { status: httpStatusFromServiceError(error) });
  }

  if (outcome.mode === "async") {
    logger.info(
      { action: body.action, jobId: outcome.jobId, total: outcome.total },
      "Escalated bulk action to an async job"
    );
    return NextResponse.json(outcome, { status: 202 });
  }

  logger.info(
    { action: body.action, failed: outcome.result.failed.length, succeeded: outcome.result.succeeded.length },
    "Completed bulk action synchronously"
  );
  return NextResponse.json(outcome, { status: 200 });
}
