"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@szum-tech/design-system/components/button";
import { Field, FieldError, FieldGroup } from "@szum-tech/design-system/components/field";
import { Input } from "@szum-tech/design-system/components/input";
import { Label } from "@szum-tech/design-system/components/label";
import { Separator } from "@szum-tech/design-system/components/separator";
import { SheetFooter } from "@szum-tech/design-system/components/sheet";
import { toast } from "@szum-tech/design-system/components/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@szum-tech/design-system/components/tooltip";
import { InfoIcon } from "lucide-react";
import { type Resolver, useForm } from "react-hook-form";
import { simulationParamsSchema } from "~/features/tickets/schemas";
import type { SimulationParams } from "~/features/tickets/types/bulk";
import type { ActionResponse } from "~/lib/action-types";

const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 100;

type DevPanelFormProps = {
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
          <InfoIcon aria-hidden={true} className="size-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-pretty">{explanation}</TooltipContent>
      </Tooltip>
    </span>
  );
}

/**
 * The actual simulation-settings form — everything the Sheet shell (`DevPanel`) can't own itself,
 * since a Server Component can't react to `isDirty`/`isValid`/`isSubmitting` after the initial render.
 * Every change here round-trips through a server action; the next bulk request (from any tab) sees it.
 */
export function DevPanelForm({ initialSimulation, onUpdateSimulationAction }: DevPanelFormProps) {
  const { register, handleSubmit, watch, reset, formState } = useForm<SimulationParams>({
    defaultValues: initialSimulation,
    mode: "onChange",
    // `simulationParamsSchema` uses `z.coerce.number()`, whose Zod-4 input type is `unknown` per field —
    // that makes the inferred resolver type not structurally match `Resolver<SimulationParams>`. The cast
    // is safe: `valueAsNumber: true` on every field below means the resolver only ever receives real
    // numbers at runtime regardless of what the type system tracks pre-coercion.
    resolver: zodResolver(simulationParamsSchema) as Resolver<SimulationParams>
  });

  async function onSubmit(values: SimulationParams) {
    const result = await onUpdateSimulationAction(values);
    if (!result.success) {
      toast.error(result.error);
    } else {
      console.log("DevPanelForm.onSubmit: server confirmed new simulation params", result.data);

      toast.success("Simulation settings updated successfully.");
      // Re-baseline dirty-tracking against the server-confirmed values, not just `values` — in case the
      // server ever normalizes anything beyond what the shared Zod schema already guarantees.
      reset(result.data, { keepDirty: false });
    }
  }

  return (
    <form className="flex flex-1 flex-col" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup className="flex-1 px-4">
        <Field data-invalid={!!formState.errors.failureRate}>
          <FieldLabel
            explanation="Independent probability that any single item fails with a simulated conflict. Rolled fresh on every attempt, so retrying a failed item always has this same chance of succeeding."
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
              step={0.05}
              type="range"
              {...register("failureRate", { valueAsNumber: true })}
            />
            <span className="w-12 text-right text-body-sm tabular-nums">{Math.round(watch("failureRate") * 100)}%</span>
          </div>
          <FieldError errors={[formState.errors.failureRate]} />
        </Field>

        <Field data-invalid={!!formState.errors.seed}>
          <FieldLabel
            explanation="Seed for the simulated per-item latency only. The same seed and ticket id always wait the same simulated delay — it has no effect on whether an item succeeds or fails."
            htmlFor="dev-panel-seed"
            label="Seed"
          />
          <Input
            id="dev-panel-seed"
            invalid={!!formState.errors.seed}
            step={1}
            type="number"
            {...register("seed", { valueAsNumber: true })}
          />
          <FieldError errors={[formState.errors.seed]} />
        </Field>

        <Field data-invalid={!!formState.errors.concurrency}>
          <FieldLabel
            explanation="How many items the worker pool processes at once — applies to both the sync path and background jobs."
            htmlFor="dev-panel-concurrency"
            label="Concurrency"
          />
          <Input
            id="dev-panel-concurrency"
            invalid={!!formState.errors.concurrency}
            max={MAX_CONCURRENCY}
            min={MIN_CONCURRENCY}
            step={1}
            type="number"
            {...register("concurrency", { valueAsNumber: true })}
          />
          <FieldError errors={[formState.errors.concurrency]} />
        </Field>
      </FieldGroup>

      <Separator />

      <SheetFooter>
        <Button disabled={!formState.isDirty || !formState.isValid} loading={formState.isSubmitting} type="submit">
          Save
        </Button>
      </SheetFooter>
    </form>
  );
}
