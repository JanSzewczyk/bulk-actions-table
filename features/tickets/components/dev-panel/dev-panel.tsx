import { Button } from "@szum-tech/design-system/components/button";
import { SettingsIcon } from "lucide-react";
import { getSimulationParams } from "~/features/tickets/server";
import { updateSimulationParamsAction } from "~/features/tickets/server/actions/update-simulation-params.action";
import { createLogger } from "~/lib/logger";
import { DevPanelSheet } from "./dev-panel-sheet";

const logger = createLogger({ module: "dev-panel" });

/** Trigger-shaped placeholder so the header doesn't shift once the real panel streams in. */
export function DevPanelFallback() {
  return (
    <Button loading size="sm" startIcon={<SettingsIcon />} variant="outline">
      Dev panel
    </Button>
  );
}

/**
 * Fetches its own data independently of the page's `loadData()` — a side tool for tuning the bulk-action
 * simulation, not core page data, so it must never hold up the ticket table. Rendered inside a
 * `<Suspense>` boundary so a slow/failing fetch only delays/blanks the panel itself.
 *
 * The Sheet shell and all interactive form state live in `DevPanelSheet` (a Client Component), so this
 * component needs no `"use client"` of its own — it just fetches the initial values once and hands them
 * down.
 */
export async function DevPanel() {
  const [error, simulation] = await getSimulationParams();
  if (error) {
    logger.error({ errorCode: error.code, isRetryable: error.isRetryable }, "Failed to load simulation params");
    return null;
  }

  return <DevPanelSheet initialSimulation={simulation} onUpdateSimulationAction={updateSimulationParamsAction} />;
}
