import { NextResponse } from "next/server";
import { simulationParamsSchema } from "~/features/tickets/schemas";
import { readSimulationParams, updateSimulationParams } from "~/features/tickets/server/services";
import { createLogger } from "~/lib/logger";

export const dynamic = "force-dynamic";

const logger = createLogger({ module: "api-dev-simulation" });

/** `GET /api/dev/simulation` — current server-side latency/failure simulation knobs. */
export function GET() {
  return NextResponse.json(readSimulationParams());
}

/** `PATCH /api/dev/simulation` — updates the knobs used by every bulk request from now on. */
export async function PATCH(request: Request) {
  let body: ReturnType<typeof simulationParamsSchema.parse>;
  try {
    body = simulationParamsSchema.parse(await request.json());
  } catch (caught) {
    logger.warn(
      { error: caught instanceof Error ? caught.message : String(caught) },
      "Rejected invalid simulation params"
    );
    return NextResponse.json({ error: "Invalid simulation params payload" }, { status: 400 });
  }

  const updated = updateSimulationParams(body);
  logger.info(updated, "Updated simulation params");
  return NextResponse.json(updated);
}
