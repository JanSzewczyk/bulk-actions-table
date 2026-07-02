import "server-only";

import { getTeammates } from "~/features/tickets/server/db";
import type { Teammate } from "~/features/tickets/types/teammate";

/**
 * Returns the assignable teammates. The set is small and static, so it needs no pagination; in
 * production this would grow a `?q=` typeahead. Called only by the `GET /api/users` route handler.
 */
export function listTeammates(): Array<Teammate> {
  return getTeammates();
}
