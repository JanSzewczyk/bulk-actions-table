import { expect, test } from "@playwright/test";

/**
 * E2E Test: Dev Panel simulation settings persistence
 *
 * Component: features/tickets/components/dev-panel-sheet.tsx
 *
 * Regression guard for a bug where closing and reopening the "Dev panel" Sheet reset the form back to
 * its original values, even after a successful save — `react-hook-form` state lived inside a child of
 * `SheetContent` that Radix unmounts whenever the sheet closes. The fix moved `useForm` up into
 * `DevPanelSheet`, which builds the `<Sheet>` itself and is never unmounted, so its state survives any
 * number of close/reopen cycles.
 *
 * Concurrency is used here (a plain number input) rather than the Failure rate range slider, so the
 * saved value can be asserted exactly instead of depending on slider drag/keypress deltas.
 *
 * Note: `/api/dev/simulation` is backed by a single in-memory store shared by every request (see
 * `features/tickets/server/db/store.ts`), so this test is not isolated from other tests or browser
 * projects mutating the same simulation params concurrently.
 */
test("saved simulation settings survive closing and reopening the dev panel", async ({ page }) => {
  await page.goto("/");

  const devPanelTrigger = page.getByRole("button", { name: "Dev panel" });
  // `DevPanelFallback` (a disabled, loading-styled placeholder) renders under the same accessible name
  // while the real `DevPanel` streams in behind its `<Suspense>` boundary — wait for the real, enabled
  // trigger before clicking, or the click can land on the inert fallback and do nothing.
  await expect(devPanelTrigger).toBeEnabled();

  // Open the Sheet.
  await devPanelTrigger.click();
  const sheet = page.getByRole("dialog", { name: "Simulation settings" });
  await expect(sheet).toBeVisible();

  // Pick a value guaranteed to differ from whatever is currently stored.
  const concurrencyInput = sheet.getByRole("spinbutton", { name: "Concurrency" });
  const currentValue = await concurrencyInput.inputValue();
  const newValue = currentValue === "37" ? "73" : "37";

  // Change the setting. `.fill()` sets the DOM value without dispatching the keystroke-level events
  // this input's `onChange` needs to mark the form dirty, so type it out instead.
  await concurrencyInput.click();
  await concurrencyInput.press("ControlOrMeta+A");
  await concurrencyInput.pressSequentially(newValue);
  const saveButton = sheet.getByRole("button", { name: "Save" });
  await expect(saveButton).toBeEnabled();

  // Save it.
  await saveButton.click();
  await expect(page.getByText("Simulation settings updated successfully.")).toBeVisible();
  await expect(saveButton).toBeDisabled();

  // Close the Sheet.
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).not.toBeVisible();

  // Reopen it.
  await devPanelTrigger.click();
  const reopenedSheet = page.getByRole("dialog", { name: "Simulation settings" });
  await expect(reopenedSheet).toBeVisible();

  // The value saved earlier must still be there, not the original default.
  await expect(reopenedSheet.getByRole("spinbutton", { name: "Concurrency" })).toHaveValue(newValue);
});
