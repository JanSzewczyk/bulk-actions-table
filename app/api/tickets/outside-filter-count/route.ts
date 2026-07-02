import { NextResponse } from "next/server";
import { parseOutsideFilterCountRequest } from "~/features/tickets/schemas";
import { countSelectionOutsideFilter } from "~/features/tickets/server/services";
import { createLogger } from "~/lib/logger";

export const dynamic = "force-dynamic";

const logger = createLogger({ module: "api-tickets-outside-filter-count" });

/**
 * `POST /api/tickets/outside-filter-count`
 *
 * Given a small set of selected ids and the active filter, returns how many of them no longer
 * match — backs the bulk toolbar's "(N outside current filter)" hint for an `include` selection.
 */
export async function POST(request: Request) {
  let body: ReturnType<typeof parseOutsideFilterCountRequest>;
  try {
    body = parseOutsideFilterCountRequest(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const count = countSelectionOutsideFilter(body.ids, body.filter);
  logger.info({ count, total: body.ids.length }, "Served outside-filter count");
  return NextResponse.json({ count });
}
