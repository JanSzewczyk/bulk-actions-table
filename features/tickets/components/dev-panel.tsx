"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { Input } from "@szum-tech/design-system/components/input";
import { Label } from "@szum-tech/design-system/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@szum-tech/design-system/components/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@szum-tech/design-system/components/tooltip";
import { InfoIcon, SettingsIcon } from "lucide-react";
import * as React from "react";
import type { SimulationParams } from "~/features/tickets/types/bulk";
import type { ActionResponse } from "~/lib/action-types";

type DevPanelProps = {
  initialSimulation: SimulationParams;
  onUpdateSimulationAction(params: SimulationParams): ActionResponse<SimulationParams>;
};

type FieldLabelProps = {
  htmlFor: string;
  label: string;
  explanation: string;
};

function FieldLabel({ htmlFor, label, explanation }: FieldLabelProps) {
  return (
    <span className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Tooltip>
        <TooltipTrigger aria-label={`What is "${label}"?`}>
          <InfoIcon className="size-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>{explanation}</TooltipContent>
      </Tooltip>
    </span>
  );
}

/**
 * Simulation knobs are server-side state (`GET`/`PATCH /api/dev/simulation`) — this panel is a thin
 * remote control over them, not a source of truth. The initial values come from the RSC page; every
 * change here round-trips through a server action so the next bulk request (from any tab) sees it.
 */
export function DevPanel({ initialSimulation, onUpdateSimulationAction }: DevPanelProps) {
  const [simulation, setSimulation] = React.useState(initialSimulation);
  const [isPending, startTransition] = React.useTransition();
  const simulationRef = React.useRef(simulation);
  simulationRef.current = simulation;

  function commit() {
    const current = simulationRef.current;
    startTransition(async () => {
      await onUpdateSimulationAction(current);
    });
  }

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

        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-2">
            <FieldLabel
              explanation="Chance that any single item in a bulk action fails with a simulated conflict, instead of succeeding."
              htmlFor="dev-panel-failure-rate"
              label="Failure rate"
            />
            <div className="flex items-center gap-3">
              <input
                aria-label="Failure rate"
                className="h-2 w-full flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                id="dev-panel-failure-rate"
                max={1}
                min={0}
                onChange={(event) => setSimulation((prev) => ({ ...prev, failureRate: Number(event.target.value) }))}
                onKeyUp={commit}
                onPointerUp={commit}
                step={0.05}
                type="range"
                value={simulation.failureRate}
              />
              <span className="w-12 text-right text-body-sm tabular-nums">
                {Math.round(simulation.failureRate * 100)}%
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              explanation="Seed for the deterministic per-item simulation. The same seed and ticket id always produce the same latency and pass/fail outcome."
              htmlFor="dev-panel-seed"
              label="Seed"
            />
            <Input
              id="dev-panel-seed"
              onBlur={commit}
              onChange={(event) => setSimulation((prev) => ({ ...prev, seed: Number(event.target.value) }))}
              type="number"
              value={simulation.seed}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              explanation="How many items the worker pool processes at once — applies to both the sync path and background jobs."
              htmlFor="dev-panel-concurrency"
              label="Concurrency"
            />
            <Input
              id="dev-panel-concurrency"
              min={1}
              onBlur={commit}
              onChange={(event) => setSimulation((prev) => ({ ...prev, concurrency: Number(event.target.value) }))}
              type="number"
              value={simulation.concurrency}
            />
          </div>
        </div>

        <SheetFooter>
          <span className="text-muted-foreground text-small">{isPending ? "Saving…" : "Saved"}</span>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
