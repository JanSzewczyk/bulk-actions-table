import { expect, fn, screen } from "storybook/test";
import preview from "~/.storybook/preview";
import type { Pagination, TableQuery } from "~/features/tickets/types/table-query";
import { TablePagination } from "./table-pagination";

function buildQuery(overrides: Partial<TableQuery> = {}): TableQuery {
  return {
    assigneeIds: null,
    direction: null,
    page: 1,
    q: null,
    size: 25,
    sort: null,
    status: null,
    ...overrides
  };
}

function buildPagination(overrides: Partial<Pagination> = {}): Pagination {
  return {
    page: 1,
    size: 25,
    total: 253,
    totalPages: 11,
    ...overrides
  };
}

const meta = preview.meta({
  args: { onQueryChange: fn() },
  component: TablePagination,
  parameters: {
    layout: "padded"
  },
  title: "Tickets/Table Pagination"
});

export const MiddlePage = meta.story({
  args: {
    isPending: false,
    pagination: buildPagination({ page: 5 }),
    query: buildQuery({ page: 5 })
  }
});

MiddlePage.test("First, previous, next and last controls are all enabled", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /first page/i })).toBeEnabled();
  await expect(canvas.getByRole("button", { name: /previous page/i })).toBeEnabled();
  await expect(canvas.getByRole("button", { name: /next page/i })).toBeEnabled();
  await expect(canvas.getByRole("button", { name: /last page/i })).toBeEnabled();
});

MiddlePage.test("Clicking next page calls onQueryChange with the next page", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /next page/i }));
  await expect(args.onQueryChange).toHaveBeenCalledWith({ page: 6 });
});

MiddlePage.test(
  "Clicking previous page calls onQueryChange with the previous page",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /previous page/i }));
    await expect(args.onQueryChange).toHaveBeenCalledWith({ page: 4 });
  }
);

MiddlePage.test("Clicking first page calls onQueryChange with page 1", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /first page/i }));
  await expect(args.onQueryChange).toHaveBeenCalledWith({ page: 1 });
});

MiddlePage.test("Clicking last page calls onQueryChange with the last page", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /last page/i }));
  await expect(args.onQueryChange).toHaveBeenCalledWith({ page: 11 });
});

MiddlePage.test(
  "Changing the per-page select calls onQueryChange with the new size",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: /per page/i }));

    const option = await screen.findByRole("option", { name: "50" });
    await userEvent.click(option);

    await expect(args.onQueryChange).toHaveBeenCalledWith({ size: 50 });
  }
);

export const FirstPage = meta.story({
  args: {
    isPending: false,
    pagination: buildPagination({ page: 1 }),
    query: buildQuery({ page: 1 })
  }
});

FirstPage.test("First and previous controls are disabled on the first page", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /first page/i })).toBeDisabled();
  await expect(canvas.getByRole("button", { name: /previous page/i })).toBeDisabled();
});

FirstPage.test("Next and last controls remain enabled on the first page", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /next page/i })).toBeEnabled();
  await expect(canvas.getByRole("button", { name: /last page/i })).toBeEnabled();
});

export const LastPage = meta.story({
  args: {
    isPending: false,
    pagination: buildPagination({ page: 11 }),
    query: buildQuery({ page: 11 })
  }
});

LastPage.test("Next and last controls are disabled on the last page", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /next page/i })).toBeDisabled();
  await expect(canvas.getByRole("button", { name: /last page/i })).toBeDisabled();
});

LastPage.test("First and previous controls remain enabled on the last page", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /first page/i })).toBeEnabled();
  await expect(canvas.getByRole("button", { name: /previous page/i })).toBeEnabled();
});

export const PendingRequest = meta.story({
  args: {
    isPending: true,
    pagination: buildPagination({ page: 5 }),
    query: buildQuery({ page: 5 })
  }
});

PendingRequest.test(
  "All pagination controls and the per-page select are disabled while pending",
  async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /first page/i })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /previous page/i })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /next page/i })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /last page/i })).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: /per page/i })).toBeDisabled();
  }
);
