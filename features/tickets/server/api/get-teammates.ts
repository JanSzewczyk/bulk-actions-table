import "server-only";

import type { Teammate } from "~/features/tickets/types/teammate";
import { apiFetch } from "~/lib/api/http-client";
import type { ServiceResult } from "~/lib/services/errors";

/**
 * Fetches the assignable teammates from `GET /api/users`, returned as `[error, data]`. Used by the
 * RSC page to pass the picker data down as props. Goes over HTTP so the route stays the boundary.
 */
export async function getTeammates(): Promise<ServiceResult<Array<Teammate>>> {
  const [error, body] = await apiFetch<{ data: Array<Teammate> }>("/api/users", "Teammates");
  if (error) {
    return [error, null];
  }
  return [null, body.data];
}
