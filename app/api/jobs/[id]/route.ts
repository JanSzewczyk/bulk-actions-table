import { NextResponse } from "next/server";
import { readJobStatus } from "~/features/tickets/server/services";
import { createLogger } from "~/lib/logger";

export const dynamic = "force-dynamic";

const logger = createLogger({ module: "api-jobs" });

/**
 * `GET /api/jobs/:id`
 *
 * Polled ~every 1s while a bulk action runs as an async job. Returns counters only — never the
 * failure list — so a large batch with a high failure rate can't flood the polling client.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const progress = readJobStatus(id);
  if (!progress) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  logger.info({ jobId: id, processed: progress.processed, status: progress.status }, "Served job status");
  return NextResponse.json(progress);
}
