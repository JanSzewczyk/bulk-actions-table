import { NextResponse } from "next/server";
import { listTeammates } from "~/features/tickets/server/services";
import { createLogger } from "~/lib/logger";

export const dynamic = "force-dynamic";

const logger = createLogger({ module: "api-users" });

/**
 * `GET /api/users`
 *
 * Assignable teammates for the "Assign to…" picker. The list is part of the API contract, not a
 * UI hardcode: an `assigneeId` sent to the bulk endpoint must match an id returned here.
 */
export function GET() {
  const data = listTeammates();
  logger.info({ count: data.length }, "Served teammates list");
  return NextResponse.json(data);
}
