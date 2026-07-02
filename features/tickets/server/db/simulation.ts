import "server-only";

import type { SimulationParams } from "~/features/tickets/types/bulk";
import { getStore } from "./store";

/** Current simulation knobs — server-side only, tunable via `PATCH /api/dev/simulation`. */
export function getSimulationParams(): SimulationParams {
  return getStore().simulation;
}

export function setSimulationParams(params: SimulationParams): void {
  getStore().simulation = params;
}
