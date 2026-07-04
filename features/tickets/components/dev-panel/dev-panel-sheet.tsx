"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Label, Tooltip, TooltipContent, TooltipTrigger } from "@szum-tech/design-system";
import { Button } from "@szum-tech/design-system/components/button";
import { Field, FieldError, FieldGroup } from "@szum-tech/design-system/components/field";
import { Input } from "@szum-tech/design-system/components/input";
import { Separator } from "@szum-tech/design-system/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@szum-tech/design-system/components/sheet";
import { toast } from "@szum-tech/design-system/components/toaster";
import { InfoIcon, SettingsIcon } from "lucide-react";
import { type Resolver, useForm } from "react-hook-form";
import { simulationParamsSchema } from "~/features/tickets/schemas";
import type { SimulationParams } from "~/features/tickets/types/bulk";
import type { ActionResponse } from "~/lib/action-types";

type DevPanelSheetProps = {
  initialSimulation: SimulationParams;
  onUpdateSimulationAction(params: SimulationParams): ActionResponse<SimulationParams>;
};

const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 100;
/**
 * Owns the Sheet shell and all `react-hook-form` state. Radix unmounts whatever is passed as
 * `children` to `SheetContent` whenever the sheet closes — but this component, which builds the
 * `<Sheet>` itself, is never unmounted by that. Keeping `useForm` here (instead of inside the child
 * rendered under `SheetContent`) means the form's values survive any number of close/reopen cycles,
 * so a saved change is never lost when the sheet is reopened.
 */
export function DevPanelSheet({ initialSimulation, onUpdateSimulationAction }: DevPanelSheetProps) {
  const form = useForm<SimulationParams>({
    defaultValues: initialSimulation,
    mode: "onChange",
    // `simulationParamsSchema` uses `z.coerce.number()`, whose Zod-4 input type is `unknown` per field —
    // that makes the inferred resolver type not structurally match `Resolver<SimulationParams>`. The cast
    // is safe: `valueAsNumber: true` on every field means the resolver only ever receives real numbers
    // at runtime regardless of what the type system tracks pre-coercion.
    resolver: zodResolver(simulationParamsSchema) as Resolver<SimulationParams>
  });
  // Read here, not inside `DevPanelForm` — a bare `watch()` call only re-renders the component that
  // owns `useForm`, so a child receiving `form` as a prop would show a frozen percentage on every drag.
  const failureRate = form.watch("failureRate");

  async function onSubmit(values: SimulationParams) {
    const result = await onUpdateSimulationAction(values);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Simulation settings updated successfully.");
      // Re-baseline dirty-tracking against the server-confirmed values, not just `values` — in case the
      // server ever normalizes anything beyond what the shared Zod schema already guarantees.
      form.reset(result.data, { keepDirty: false });
    }
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

        <form className="flex flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="flex-1 px-4">
            <Field data-invalid={!!form.formState.errors.failureRate}>
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
                  {...form.register("failureRate", { valueAsNumber: true })}
                />
                <span className="w-12 text-right text-body-sm tabular-nums">{Math.round(failureRate * 100)}%</span>
              </div>
              <FieldError errors={[form.formState.errors.failureRate]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.seed}>
              <FieldLabel
                explanation="Seed for the simulated per-item latency only. The same seed and ticket id always wait the same simulated delay — it has no effect on whether an item succeeds or fails."
                htmlFor="dev-panel-seed"
                label="Seed"
              />
              <Input
                id="dev-panel-seed"
                invalid={!!form.formState.errors.seed}
                step={1}
                type="number"
                {...form.register("seed", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.seed]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.concurrency}>
              <FieldLabel
                explanation="How many items the worker pool processes at once — applies to both the sync path and background jobs."
                htmlFor="dev-panel-concurrency"
                label="Concurrency"
              />
              <Input
                id="dev-panel-concurrency"
                invalid={!!form.formState.errors.concurrency}
                max={MAX_CONCURRENCY}
                min={MIN_CONCURRENCY}
                step={1}
                type="number"
                {...form.register("concurrency", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.concurrency]} />
            </Field>
          </FieldGroup>

          <Separator />

          <SheetFooter>
            <Button
              disabled={!form.formState.isDirty || !form.formState.isValid}
              loading={form.formState.isSubmitting}
              type="submit"
            >
              Save
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

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
        <TooltipTrigger aria-label={`What is "${label}"?`} tabIndex={-1}>
          <InfoIcon className="size-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-pretty">{explanation}</TooltipContent>
      </Tooltip>
    </span>
  );
}
