import { Button } from "@szum-tech/design-system/components/button";
import { SettingsIcon } from "lucide-react";
import { getSimulationParams } from "~/features/tickets/server";
import { updateSimulationParamsAction } from "~/features/tickets/server/actions/update-simulation-params.action";
import { createLogger } from "~/lib/logger";
import { DevPanel } from "./dev-panel";

const logger = createLogger({ module: "dev-panel-container" });

/** Trigger-shaped placeholder so the header doesn't shift once the real panel streams in. */
export function DevPanelFallback() {
  return (
    <Button loading size="sm" startIcon={<SettingsIcon />} variant="outline">
      Dev panel
    </Button>
  );
}

/**
 * Fetches its own data independently of the page's `loadData()`. This is a side tool for tuning the
 * bulk-action simulation, not core page data — it must never hold up the ticket table. Render this
 * inside a `<Suspense>` boundary so a slow or failing simulation-params fetch only delays/blanks the
 * panel itself, not the rest of the page.
 */
export async function DevPanelContainer() {
  const [error, simulation] = await getSimulationParams();
  if (error) {
    logger.error({ errorCode: error.code, isRetryable: error.isRetryable }, "Failed to load simulation params");
    return null;
  }

  return <DevPanel initialSimulation={simulation} onUpdateSimulationAction={updateSimulationParamsAction} />;
}
