import { expect, test } from "@playwright/test";

/**
 * E2E: ticket table mechanics on app/page.tsx ("/") — row/page selection escalation and column
 * sorting. Selection state lives entirely client-side in `SelectionProvider`
 * (features/tickets/context/selection.context.tsx), so unlike the dev-panel simulation-settings
 * tests, nothing here touches the shared server-side ticket store — these tests don't need any
 * cleanup and are safe to run in parallel.
 */

test.describe("Tickets table — selection and sorting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("selecting a single row shows the bulk toolbar, and 'Clear selection' dismisses it", async ({ page }) => {
    const firstRowCheckbox = page.locator("tbody tr").first().getByRole("checkbox");
    await firstRowCheckbox.check();

    await expect(page.getByText("Selected 1", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(firstRowCheckbox).toBeChecked();

    await page.getByRole("button", { name: "Clear selection" }).click();

    await expect(page.getByRole("button", { name: "Delete" })).not.toBeVisible();
    await expect(firstRowCheckbox).not.toBeChecked();
  });

  test("selecting every row on the page offers to select all matching tickets, and clearing resets both", async ({
    page
  }) => {
    const headerCheckbox = page.getByRole("checkbox", { name: "Select current page" });
    await headerCheckbox.check();

    // PAGE_SIZE (features/tickets/constants/index.ts) — the default page always renders this many rows.
    await expect(page.getByText("Selected 25 on this page.")).toBeVisible();

    const selectAllButton = page.getByRole("button", { name: /^Select all [\d,]+ matching$/ });
    await expect(selectAllButton).toBeVisible();
    // Read the true total from the button instead of hardcoding the seeded dataset size, so this
    // test doesn't drift if the dataset or a prior bulk action changes how many tickets match.
    const matchingCount = (await selectAllButton.textContent())?.replace(/^Select all /, "").replace(/ matching$/, "");

    await selectAllButton.click();

    await expect(page.getByText(`Selected all ${matchingCount} matching.`)).toBeVisible();
    await expect(headerCheckbox).toBeChecked();

    // Two buttons share the accessible name "Clear selection" once a selection is active: the
    // toolbar's icon-only close button and the banner's "Clear selection" link — both dispatch the
    // same `CLEAR` action, so either would do; the banner's (rendered second) is picked explicitly
    // to avoid a strict-mode ambiguity.
    await page.getByRole("button", { name: "Clear selection" }).last().click();

    await expect(page.getByRole("button", { name: "Delete" })).not.toBeVisible();
    await expect(headerCheckbox).not.toBeChecked();
  });

  test("clicking the Subject header cycles sort ascending → descending → unsorted", async ({ page }) => {
    const subjectHeader = page.getByRole("button", { name: "Subject" });
    const headerCell = page.locator("th", { has: subjectHeader });

    await expect(headerCell).toHaveAttribute("aria-sort", "none");

    await subjectHeader.click();
    await expect(page).toHaveURL(/sort=subject&direction=asc/);
    await expect(headerCell).toHaveAttribute("aria-sort", "ascending");

    await subjectHeader.click();
    await expect(page).toHaveURL(/sort=subject&direction=desc/);
    await expect(headerCell).toHaveAttribute("aria-sort", "descending");

    // Third click clears the sort entirely (asc → desc → off).
    await subjectHeader.click();
    await expect(page).not.toHaveURL(/sort=/);
    await expect(headerCell).toHaveAttribute("aria-sort", "none");
  });
});
