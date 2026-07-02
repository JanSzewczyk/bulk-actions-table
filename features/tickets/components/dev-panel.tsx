"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { Input } from "@szum-tech/design-system/components/input";
import { Label } from "@szum-tech/design-system/components/label";
import { RotateCcwIcon } from "lucide-react";
import { DEFAULT_CONCURRENCY, DEFAULT_FAILURE_RATE, DEFAULT_SEED } from "~/features/tickets/constants";
import type { SimulationParams } from "~/features/tickets/types/bulk";

type DevPanelProps = {
  simulation: SimulationParams;
  onSimulationChange(simulation: SimulationParams): void;
};

const DEFAULT_SIMULATION: SimulationParams = {
  concurrency: DEFAULT_CONCURRENCY,
  failureRate: DEFAULT_FAILURE_RATE,
  seed: DEFAULT_SEED
};

/** Dev-only controls for the bulk pipeline's deterministic simulation knobs (sent with every request). */
export function DevPanel({ simulation, onSimulationChange }: DevPanelProps) {
  return (
    <details className="rounded-md border border-border bg-muted/30 px-4 py-2 text-body-sm">
      <summary className="cursor-pointer font-semibold">Panel deweloperski (symulacja)</summary>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="dev-panel-failure-rate">Failure rate</Label>
          <Input
            className="w-24"
            id="dev-panel-failure-rate"
            max={1}
            min={0}
            onChange={(event) => onSimulationChange({ ...simulation, failureRate: Number(event.target.value) })}
            step={0.05}
            type="number"
            value={simulation.failureRate}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dev-panel-seed">Seed</Label>
          <Input
            className="w-28"
            id="dev-panel-seed"
            onChange={(event) => onSimulationChange({ ...simulation, seed: Number(event.target.value) })}
            type="number"
            value={simulation.seed}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dev-panel-concurrency">Concurrency</Label>
          <Input
            className="w-20"
            id="dev-panel-concurrency"
            min={1}
            onChange={(event) => onSimulationChange({ ...simulation, concurrency: Number(event.target.value) })}
            type="number"
            value={simulation.concurrency}
          />
        </div>
        <Button
          onClick={() => onSimulationChange(DEFAULT_SIMULATION)}
          size="sm"
          startIcon={<RotateCcwIcon />}
          variant="ghost"
        >
          Reset
        </Button>
      </div>
    </details>
  );
}
