import { expect, test } from "@playwright/test";

/**
 * E2E Test: Confirmation dialog reflects the active filter
 *
 * Components: features/tickets/components/bulk-toolbar.tsx, features/tickets/components/confirm-dialog.tsx
 *
 * The brief calls out that "what happens to selection when the user ... applies a filter" is a decision
 * left to the candidate. Here: an explicit-id selection survives a filter change, but some of its ids may
 * now fall outside what's currently visible. This test asserts that ambiguity is resolved everywhere a
 * destructive action is confirmed — the toolbar's inline count and the delete confirmation dialog itself
 * both report it, not just one of the two.
 */
test("delete confirmation reports how many selected tickets are outside the current filter", async ({ page }) => {
  await page.goto("/");

  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();

  // Pick two rows whose Status column differs, so filtering by one status leaves exactly one of them
  // outside the filter. The seeded dataset has enough status variety on page 1 that this always finds one.
  const firstIndex = 0;
  const firstStatus = await rows.nth(0).locator("td").nth(3).innerText();
  let secondIndex = -1;
  for (let i = 1; i < rowCount; i++) {
    const status = await rows.nth(i).locator("td").nth(3).innerText();
    if (status !== firstStatus) {
      secondIndex = i;
      break;
    }
  }
  expect(secondIndex, "expected at least two different statuses on the first page").toBeGreaterThan(-1);

  await rows.nth(firstIndex).getByRole("checkbox").check();
  await rows.nth(secondIndex).getByRole("checkbox").check();
  await expect(page.getByText("Selected 2", { exact: false })).toBeVisible();

  // Filter down to the first row's status — the second selected ticket no longer matches. Scoped by
  // its placeholder text since the page also has an unrelated "Per page" combobox.
  await page.getByRole("combobox").filter({ hasText: "All statuses" }).click();
  await page.getByRole("option", { name: firstStatus }).click();

  await expect(page.getByText("(1 outside the current filter)")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete selected tickets" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 of them are outside the current filter.")).toBeVisible();

  // Close without deleting anything.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toBeVisible();
});
