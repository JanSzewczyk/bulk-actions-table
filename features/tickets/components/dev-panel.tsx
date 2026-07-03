import { Button } from "@szum-tech/design-system/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@szum-tech/design-system/components/sheet";
import { SettingsIcon } from "lucide-react";
import { getSimulationParams } from "~/features/tickets/server";
import { updateSimulationParamsAction } from "~/features/tickets/server/actions/update-simulation-params.action";
import { createLogger } from "~/lib/logger";
import { DevPanelForm } from "./forms/dev-panel-form";

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
 * The Sheet/Trigger/Content pieces are pre-built Client Components (their own bundle starts with
 * `"use client"`), so this component needs no `"use client"` of its own — it just composes them around
 * `Form`, which owns all the interactive form state.
 */
export async function DevPanel() {
  const [error, simulation] = await getSimulationParams();
  if (error) {
    logger.error({ errorCode: error.code, isRetryable: error.isRetryable }, "Failed to load simulation params");
    return null;
  }

  console.log("DevPanel simulation params:", simulation);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" startIcon={<SettingsIcon />} variant="outline">
          Dev panel
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Simulation settings</SheetTitle>
          <SheetDescription>
            Server-side knobs that control the simulated latency and failure rate of every bulk request.
          </SheetDescription>
        </SheetHeader>
        <DevPanelForm initialSimulation={simulation} onUpdateSimulationAction={updateSimulationParamsAction} />
      </SheetContent>
    </Sheet>
  );
}
