import { type NextRequest, NextResponse } from "next/server";
import { parseTableQuery } from "~/features/tickets/schemas";
import { listTicketsPage } from "~/features/tickets/server/services";
import { createLogger } from "~/lib/logger";

// The store mutates in-memory, so the list must never be statically cached — always read fresh state.
export const dynamic = "force-dynamic";

const logger = createLogger({ module: "api-tickets" });

/**
 * `GET /api/tickets?page&size&sort&direction&status&q`
 *
 * The canonical list contract (paginated `{ data, pagination }`). Owns the data path: it calls the
 * service, which reads the store. Pages and actions reach this only over HTTP.
 */
export function GET(request: NextRequest) {
  const query = parseTableQuery(request.nextUrl.searchParams);
  const page = listTicketsPage(query);

  logger.info({ page: query.page, size: query.size, total: page.pagination.total }, "Served tickets list");

  return NextResponse.json(page);
}
