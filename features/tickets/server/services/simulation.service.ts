import "server-only";

import { getSimulationParams, setSimulationParams } from "~/features/tickets/server/db";
import type { SimulationParams } from "~/features/tickets/types/bulk";

export function readSimulationParams(): SimulationParams {
  return getSimulationParams();
}

export function updateSimulationParams(params: SimulationParams): SimulationParams {
  setSimulationParams(params);
  return params;
}
