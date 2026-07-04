/**
 * Test plan
 * 1. Opening the trigger reveals the sheet fields (portal content via `screen`) with initial values.
 * 2. Save button is disabled until a field is changed to a valid value (dirty + valid).
 * 3. Entering an invalid concurrency shows a field error and keeps Save disabled; fixing it re-enables
 *    Save and submitting calls onUpdateSimulationAction with the updated values (step-based flow).
 * 4. On a failed update, onUpdateSimulationAction is still called with the right args and the form
 *    stays dirty (Save re-enabled after a subsequent edit), since no global Toaster is registered in
 *    preview.tsx to assert toast text against — see note below.
 */
import { expect, fn, screen, waitFor } from "storybook/test";
import preview from "~/.storybook/preview";
import type { SimulationParams } from "~/features/tickets/types/bulk";
import type { ActionResponse } from "~/lib/action-types";
import { DevPanelSheet } from "./dev-panel-sheet";

const initialSimulation: SimulationParams = {
  concurrency: 10,
  failureRate: 0.1,
  seed: 42
};

async function updateSimulationSuccess(params: SimulationParams): ActionResponse<SimulationParams> {
  return { data: params, success: true };
}

const meta = preview.meta({
  args: {
    initialSimulation,
    onUpdateSimulationAction: fn(updateSimulationSuccess)
  },
  component: DevPanelSheet,
  parameters: {
    layout: "padded"
  },
  title: "Tickets/DevPanelSheet"
});

export const SuccessfulUpdate = meta.story({});

SuccessfulUpdate.test("Renders sheet fields with initial values", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /dev panel/i }));

  await screen.findByRole("dialog");
  await waitFor(() => expect(screen.getByRole("dialog")).toBeVisible());
  await waitFor(() => expect(screen.getByRole("heading", { name: /simulation settings/i })).toBeVisible());
  await expect(screen.getByRole("slider", { name: /failure rate/i })).toHaveValue("0.1");
  await expect(screen.getByRole("spinbutton", { name: /seed/i })).toHaveValue(42);
  await expect(screen.getByRole("spinbutton", { name: /concurrency/i })).toHaveValue(10);
  await expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
});

SuccessfulUpdate.test("Save is disabled until a field becomes dirty and valid", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /dev panel/i }));

  const seedInput = await screen.findByRole("spinbutton", { name: /seed/i });
  const saveButton = screen.getByRole("button", { name: /save/i });
  await expect(saveButton).toBeDisabled();

  await userEvent.clear(seedInput);
  await userEvent.type(seedInput, "99");

  await waitFor(() => expect(saveButton).toBeEnabled());
});

SuccessfulUpdate.test(
  "Invalid concurrency shows a field error and blocks Save until fixed, then submits",
  async ({ canvas, userEvent, args, step }) => {
    await userEvent.click(canvas.getByRole("button", { name: /dev panel/i }));

    const concurrencyInput = await screen.findByRole("spinbutton", { name: /concurrency/i });
    const saveButton = screen.getByRole("button", { name: /save/i });

    await step("Entering an out-of-range concurrency shows an error and keeps Save disabled", async () => {
      await userEvent.clear(concurrencyInput);
      await userEvent.type(concurrencyInput, "101");

      await waitFor(() => expect(concurrencyInput).toHaveAttribute("aria-invalid", "true"));
      await waitFor(() => expect(saveButton).toBeDisabled());
    });

    await step("Fixing the value to a valid, different number re-enables Save", async () => {
      await userEvent.clear(concurrencyInput);
      await userEvent.type(concurrencyInput, "20");

      await waitFor(() => expect(concurrencyInput).not.toHaveAttribute("aria-invalid", "true"));
      await waitFor(() => expect(saveButton).toBeEnabled());
    });

    await step("Submitting calls onUpdateSimulationAction with the updated values", async () => {
      await userEvent.click(saveButton);

      await waitFor(() =>
        expect(args.onUpdateSimulationAction).toHaveBeenCalledWith({
          concurrency: 20,
          failureRate: 0.1,
          seed: 42
        })
      );
    });
  }
);

async function updateSimulationFailure(_params: SimulationParams): ActionResponse<SimulationParams> {
  return { error: "Failed to update simulation settings.", success: false };
}

export const FailedUpdate = meta.story({
  args: {
    onUpdateSimulationAction: fn(updateSimulationFailure)
  }
});

// No `<Toaster />` is registered in `.storybook/preview.tsx`, so `toast.error`/`toast.success` calls
// render nothing here to assert against visually. We instead assert the callback contract directly and
// the resulting form state: on success `form.reset` re-baselines dirty-tracking (Save goes back to
// disabled); on failure the form is left dirty (Save stays enabled) so the user can retry.
FailedUpdate.test(
  "Calls onUpdateSimulationAction and leaves the form dirty so the user can retry",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /dev panel/i }));

    const seedInput = await screen.findByRole("spinbutton", { name: /seed/i });
    const saveButton = screen.getByRole("button", { name: /save/i });

    await userEvent.clear(seedInput);
    await userEvent.type(seedInput, "7");
    await waitFor(() => expect(saveButton).toBeEnabled());

    await userEvent.click(saveButton);

    await waitFor(() =>
      expect(args.onUpdateSimulationAction).toHaveBeenCalledWith({
        concurrency: 10,
        failureRate: 0.1,
        seed: 7
      })
    );
    await waitFor(() => expect(saveButton).toBeEnabled());
  }
);
