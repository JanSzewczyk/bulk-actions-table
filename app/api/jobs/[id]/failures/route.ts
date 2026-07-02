import { type NextRequest, NextResponse } from "next/server";
import { parseJobFailuresQuery } from "~/features/tickets/schemas";
import { readJobFailures } from "~/features/tickets/server/services";
import { createLogger } from "~/lib/logger";

export const dynamic = "force-dynamic";

const logger = createLogger({ module: "api-jobs-failures" });

/**
 * `GET /api/jobs/:id/failures?page&size`
 *
 * Paginated failure list for a job — the only place individual failed ids surface, since
 * `GET /api/jobs/:id` deliberately reports counters only.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { page, size } = parseJobFailuresQuery(request.nextUrl.searchParams);
  const result = readJobFailures(id, page, size);

  logger.info({ jobId: id, page, size, total: result.pagination.total }, "Served job failures page");
  return NextResponse.json(result);
}
