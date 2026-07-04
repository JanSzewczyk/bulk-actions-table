/**
 * Test plan
 * 1. Renders all expected content — search input, status select, assignee filter, no clear button
 *    when no filter is active.
 * 2. Selecting a status option calls onQueryChange immediately with { status }.
 * 3. Typing in search calls onQueryChange with { q } only after the debounce (waitFor).
 * 4. Typing then clearing the search commits `{ q: null }` after the debounce.
 * 5. "Clear filters" only renders when a filter is active, and clicking it resets all three
 *    (status/q/assigneeIds) via one onQueryChange call.
 * 6. When isPending is true, a spinner replaces the search icon and the status/assignee controls
 *    are disabled.
 */
import { expect, fn, mocked, screen, waitFor } from "storybook/test";
import preview from "~/.storybook/preview";
import { teammateBuilder } from "~/features/tickets/test/builders";
import type { TableQuery } from "~/features/tickets/types/table-query";
import { TicketStatus } from "~/features/tickets/types/ticket";
import { TableControls } from "./table-controls";

teammateBuilder.reset();
const teammates = teammateBuilder.many(3);

const baseQuery: TableQuery = {
  assigneeIds: null,
  direction: null,
  page: 1,
  q: null,
  size: 25,
  sort: null,
  status: null
};

const meta = preview.meta({
  args: {
    isPending: false,
    onQueryChange: fn(),
    query: baseQuery,
    teammates
  },
  beforeEach: async ({ args }) => {
    mocked(args.onQueryChange).mockClear();
  },
  component: TableControls,
  parameters: {
    layout: "padded"
  },
  title: "Tickets/TableControls"
});

export const NoActiveFilters = meta.story({});

NoActiveFilters.test("Renders all expected content", async ({ canvas }) => {
  await expect(canvas.getByPlaceholderText("Search...")).toBeVisible();
  const comboboxes = canvas.getAllByRole("combobox");
  await expect(comboboxes).toHaveLength(2);
  await expect(canvas.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
});

NoActiveFilters.test(
  "Selecting a status option calls onQueryChange immediately",
  async ({ canvas, userEvent, args }) => {
    const statusTrigger = canvas.getAllByRole("combobox")[0];
    await expect(statusTrigger).toBeVisible();
    await userEvent.click(statusTrigger as HTMLElement);
    await userEvent.click(await screen.findByRole("option", { name: "Resolved" }));
    await expect(args.onQueryChange).toHaveBeenCalledWith({ status: TicketStatus.RESOLVED });
  }
);

NoActiveFilters.test(
  "Typing in search commits the query only after the debounce",
  async ({ canvas, userEvent, args }) => {
    const search = canvas.getByPlaceholderText("Search...");
    await userEvent.type(search, "bug");

    await expect(args.onQueryChange).not.toHaveBeenCalled();
    await waitFor(() => expect(args.onQueryChange).toHaveBeenCalledWith({ q: "bug" }));
  }
);

NoActiveFilters.test(
  "Clearing the search field commits null after the debounce",
  async ({ canvas, userEvent, args }) => {
    const search = canvas.getByPlaceholderText("Search...");
    await userEvent.type(search, "bug");
    await waitFor(() => expect(args.onQueryChange).toHaveBeenCalledWith({ q: "bug" }));

    await userEvent.click(canvas.getByRole("button", { name: /clear search/i }));
    await waitFor(() => expect(args.onQueryChange).toHaveBeenCalledWith({ q: null }));
  }
);

export const ActiveStatusFilter = meta.story({
  args: {
    query: { ...baseQuery, status: TicketStatus.OPEN }
  }
});

ActiveStatusFilter.test(
  "Clear filters button resets all three fields in one call",
  async ({ canvas, userEvent, args }) => {
    const clearButton = canvas.getByRole("button", { name: /clear filters/i });
    await expect(clearButton).toBeVisible();

    await userEvent.click(clearButton);

    await expect(args.onQueryChange).toHaveBeenCalledOnce();
    await expect(args.onQueryChange).toHaveBeenCalledWith({ assigneeIds: null, q: null, status: null });
  }
);

export const Pending = meta.story({
  args: {
    isPending: true,
    query: { ...baseQuery, status: TicketStatus.OPEN }
  }
});

Pending.test("Shows a spinner instead of the search icon and disables the controls", async ({ canvas }) => {
  const search = canvas.getByPlaceholderText("Search...");
  await expect(canvas.getByRole("status", { name: /loading/i })).toBeVisible();
  await expect(canvas.queryByLabelText(/clear search/i)).not.toBeInTheDocument();

  const comboboxes = canvas.getAllByRole("combobox");
  for (const combobox of comboboxes) {
    await expect(combobox).toBeDisabled();
  }
  await expect(canvas.getByRole("button", { name: /clear filters/i })).toBeDisabled();
  await expect(search).toBeEnabled();
});
