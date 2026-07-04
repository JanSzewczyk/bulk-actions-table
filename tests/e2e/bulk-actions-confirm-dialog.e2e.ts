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
test("delete confirmation reports how many selected tickets are outside the current filter", async ({
  page,
  request
}) => {
  // Pick two tickets with different statuses directly over the API, rather than scanning the default
  // (unsorted) page 1 for incidental variety — the seeded dataset doesn't guarantee two statuses land
  // in the first 25 rows, and that assumption flaked in CI even though it always held locally.
  const [openPage, pendingPage] = await Promise.all([
    (await request.get("/api/tickets?status=OPEN&page=1&size=1")).json(),
    (await request.get("/api/tickets?status=PENDING&page=1&size=1")).json()
  ]);
  const firstTicket = openPage.data[0];
  const secondTicket = pendingPage.data[0];

  // Guard the assumption the rest of this test depends on: if the status filter ever regressed and
  // both queries returned tickets of the same status, the two would match the same filter option
  // below and "(1 outside the current filter)" would never appear — failing confusingly, far from
  // the real cause. Assert it explicitly here instead.
  expect(firstTicket.status).not.toBe(secondTicket.status);

  await page.goto("/");

  // Search narrows to exactly the one ticket at a time. Selection survives a search/filter change in
  // `include` mode (see `applyFilterChange` in `utils/selection.ts`), so checking each ticket under
  // its own search term accumulates both into a single two-item selection. Waiting for the specific
  // ticket's row (not just "any 1 row") matters: the search is debounced, so right after `.fill()` the
  // previous search term's single-row result can still be showing and satisfy a bare count check,
  // making the second `.check()` land on the already-checked first ticket instead of the second one.
  const searchBox = page.getByPlaceholder("Search...");
  await searchBox.fill(firstTicket.subject);
  const firstRow = page.locator("tbody tr").filter({ hasText: firstTicket.subject });
  await expect(firstRow).toHaveCount(1);
  const firstStatus = await firstRow.locator("td").nth(3).innerText();
  await firstRow.getByRole("checkbox").check();

  await searchBox.fill(secondTicket.subject);
  const secondRow = page.locator("tbody tr").filter({ hasText: secondTicket.subject });
  await expect(secondRow).toHaveCount(1);
  await secondRow.getByRole("checkbox").check();

  await searchBox.fill("");
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
