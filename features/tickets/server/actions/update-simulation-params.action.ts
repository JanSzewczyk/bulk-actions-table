"use server";

import { updateSimulationParams } from "~/features/tickets/server/api";
import type { SimulationParams } from "~/features/tickets/types/bulk";
import type { ActionResponse } from "~/lib/action-types";
import { logger } from "./logger";
import { mapServiceError } from "./map-service-error";

/** Called by the dev panel when a simulation knob changes — updates the server-side state via PATCH. */
export async function updateSimulationParamsAction(params: SimulationParams): ActionResponse<SimulationParams> {
  const [error, updated] = await updateSimulationParams(params);
  if (error) {
    logger.error({ errorCode: error.code }, "Failed to update simulation params");
    return { error: mapServiceError(error), success: false };
  }

  return { data: updated, success: true };
}
