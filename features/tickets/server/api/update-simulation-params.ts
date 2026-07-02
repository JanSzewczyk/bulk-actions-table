import "server-only";

import type { SimulationParams } from "~/features/tickets/types/bulk";
import { getBaseUrl } from "~/lib/api/http-client";
import { createLogger } from "~/lib/logger";
import { categorizeServiceError, type ServiceResult, serviceErrorFromStatus } from "~/lib/services/errors";

const logger = createLogger({ module: "api-client" });

/** Updates the server-side simulation knobs via `PATCH /api/dev/simulation`. */
export async function updateSimulationParams(params: SimulationParams): Promise<ServiceResult<SimulationParams>> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/dev/simulation`, {
      body: JSON.stringify(params),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });

    if (!response.ok) {
      const error = serviceErrorFromStatus(response.status, "SimulationParams");
      logger.error({ errorCode: error.code, status: response.status }, "Simulation params update failed");
      return [error, null];
    }

    const data = (await response.json()) as SimulationParams;
    return [null, data];
  } catch (caught) {
    const error = categorizeServiceError(caught, "SimulationParams");
    logger.error({ errorCode: error.code, isRetryable: error.isRetryable }, "Simulation params update threw");
    return [error, null];
  }
}
