import "server-only";

import type { SimulationParams } from "~/features/tickets/types/bulk";
import { apiFetch } from "~/lib/api/http-client";
import type { ServiceResult } from "~/lib/services/errors";

/** Fetches the current simulation knobs from `GET /api/dev/simulation` — used for the dev panel's initial values. */
export async function getSimulationParams(): Promise<ServiceResult<SimulationParams>> {
  return apiFetch<SimulationParams>("/api/dev/simulation", "SimulationParams");
}
