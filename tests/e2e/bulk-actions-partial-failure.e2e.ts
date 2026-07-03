import { expect, test } from "@playwright/test";

/**
 * E2E Test: Partial-failure UX for bulk actions
 *
 * Components: features/tickets/components/tickets-table.tsx (row error marker),
 * features/tickets/components/tickets-table-section.tsx (outcome handling)
 *
 * Covers the brief's core "what happens when a bulk action partially succeeds" requirement: a failed
 * row must stay selected with a visible error marker, and the toast's "Retry (N)" action must resubmit
 * exactly the failed subset. The simulated failure rate is a knob on the shared, in-memory server store
 * (`/api/dev/simulation`), so this test drives it directly via the API rather than the Dev panel UI for
 * determinism, and restores the original value afterwards — like `dev-panel.e2e.ts`, this store is not
 * isolated across concurrently running tests/browser projects.
 */
test("a guaranteed-failing bulk action marks the affected rows and offers a working retry", async ({
  page,
  request
}) => {
  const originalParams = await (await request.get("/api/dev/simulation")).json();

  try {
    // Force every item to fail, regardless of the current seed/latency settings.
    await request.patch("/api/dev/simulation", {
      data: { ...originalParams, failureRate: 1 }
    });

    await page.goto("/");

    const rowCheckboxes = page.locator("tbody tr").getByRole("checkbox");
    await rowCheckboxes.nth(0).check();
    await rowCheckboxes.nth(1).check();
    await expect(page.getByText("Selected 2", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Archive" }).click();

    // Sync path completes almost immediately for a 2-item selection (well under the async threshold).
    await expect(page.getByText("Archived 0 of 2 · 2 failed.")).toBeVisible();
    const retryButton = page.getByRole("button", { name: "Retry (2)" });
    await expect(retryButton).toBeVisible();

    // Both rows stay selected and each shows the error marker — selection is the retry mechanism.
    await expect(rowCheckboxes.nth(0)).toBeChecked();
    await expect(rowCheckboxes.nth(1)).toBeChecked();
    await expect(page.getByRole("button", { name: "Last action failed on this ticket" })).toHaveCount(2);

    // Retrying with the failure forced off must succeed and clear both markers.
    await request.patch("/api/dev/simulation", { data: { ...originalParams, failureRate: 0 } });
    await retryButton.click();

    await expect(page.getByText("Archived 2 tickets.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Last action failed on this ticket" })).toHaveCount(0);
  } finally {
    await request.patch("/api/dev/simulation", { data: originalParams });
  }
});
