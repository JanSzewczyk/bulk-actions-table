import { expect, test } from "@playwright/test";

/**
 * E2E: Dev panel "Simulation settings" sheet.
 *
 * Page: app/page.tsx ("/") — `DevPanel` (server component) reads `initialSimulation` once via
 * `GET /api/dev/simulation`, then renders `DevPanelSheet` (client component,
 * features/tickets/components/dev-panel/dev-panel-sheet.tsx). Saving goes through
 * `PATCH /api/dev/simulation`, which mutates a process-wide in-memory singleton
 * (features/tickets/server/db/store.ts) shared by every browser project against the same
 * `npm run start` server, with no reset endpoint. Only the "saving" test below writes to it — it's
 * pinned to a single project (see its own `test.skip`) so there's exactly one writer, and its own
 * `afterEach` restores the documented defaults so it doesn't leak state into later e2e runs.
 */

const DEFAULT_SIMULATION_PARAMS = { concurrency: 50, failureRate: 0.1, seed: 12345 };

test.describe("Dev panel — simulation settings sheet", () => {
  test("editing a parameter survives closing and reopening the sheet without saving", async ({ page }) => {
    // Never clicks Save, so this never touches the shared server-side store — safe to run on every
    // browser project in parallel, unlike the "saving" test below.
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Dev panel" });
    await expect(trigger).toBeEnabled();
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Simulation settings" });
    await expect(dialog).toBeVisible();

    const seedInput = page.locator("#dev-panel-seed");

    // `pressSequentially`, not `fill` — a plain `fill` can update the DOM value without firing the
    // per-keystroke input events react-hook-form's `register` relies on to mark the field dirty.
    await seedInput.clear();
    await seedInput.pressSequentially("777");
    await expect(seedInput).toHaveValue("777");

    // Close without saving.
    await page.getByRole("button", { name: "Close" }).click();
    await expect(dialog).not.toBeVisible();

    // Reopening must still show the unsaved edit: `useForm` lives in `DevPanelSheet` itself, which
    // Radix never unmounts when the sheet closes — only `SheetContent`'s children are unmounted.
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(seedInput).toHaveValue("777");
  });

  test.describe("saving a parameter", () => {
    test.afterEach(async ({ request }) => {
      await request.patch("/api/dev/simulation", { data: DEFAULT_SIMULATION_PARAMS });
    });

    test("persists it across closing the sheet and reloading the page", async ({ page, browserName }) => {
      // The simulation-params store is a single process-wide singleton, and every browser project
      // in playwright.config.ts targets the same server — running this write on more than one
      // project at once would race concurrent writers against the same store. Pinning it to
      // chromium keeps the writer count at exactly one; persistence itself is browser-independent.
      // biome-ignore lint/suspicious/noSkippedTests: permanent cross-project pin, not a WIP placeholder
      test.skip(browserName !== "chromium", "Writes the shared simulation store — runs once, on chromium only.");

      await page.goto("/");

      const trigger = page.getByRole("button", { name: "Dev panel" });
      await expect(trigger).toBeEnabled();
      await trigger.click();

      const dialog = page.getByRole("dialog", { name: "Simulation settings" });
      await expect(dialog).toBeVisible();

      const concurrencyInput = page.locator("#dev-panel-concurrency");
      await expect(concurrencyInput).toHaveValue(String(DEFAULT_SIMULATION_PARAMS.concurrency));

      // See the note above `seedInput` in the previous test — same reason for `pressSequentially`.
      await concurrencyInput.clear();
      await concurrencyInput.pressSequentially("77");

      const saveButton = page.getByRole("button", { name: "Save" });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      await expect(page.getByText("Simulation settings updated successfully.")).toBeVisible();
      // The save re-baselines the form as not-dirty, so Save goes back to disabled.
      await expect(saveButton).toBeDisabled();

      await page.getByRole("button", { name: "Close" }).click();
      await expect(dialog).not.toBeVisible();

      // A full reload re-renders the server component `DevPanel`, which re-fetches
      // `initialSimulation` from the store — this is the real persistence check, independent of the
      // client-side form state exercised by the test above.
      await page.reload();

      await expect(trigger).toBeEnabled();
      await trigger.click();
      await expect(page.getByRole("dialog", { name: "Simulation settings" })).toBeVisible();
      await expect(page.locator("#dev-panel-concurrency")).toHaveValue("77");
    });
  });
});
