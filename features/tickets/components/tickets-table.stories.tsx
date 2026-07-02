import { expect, fn } from "storybook/test";
import preview from "~/.storybook/preview";
import { SelectionProvider } from "~/features/tickets/hooks/use-selection";
import { SortDirection, TicketSortField } from "~/features/tickets/types/table-query";
import type { TicketListItem } from "~/features/tickets/types/ticket";
import { TicketStatus } from "~/features/tickets/types/ticket";
import { TicketsTable } from "./tickets-table";

const tickets: Array<TicketListItem> = [
  {
    assignee: { avatarUrl: null, id: "u1", name: "Anna Kowalska" },
    createdAt: "2025-06-30T10:15:00.000Z",
    customer: "Acme Sp. z o.o.",
    id: "t1",
    status: TicketStatus.OPEN,
    subject: "Nie działa logowanie (#1024)"
  },
  {
    assignee: null,
    createdAt: "2025-06-28T08:00:00.000Z",
    customer: "Globex",
    id: "t2",
    status: TicketStatus.PENDING,
    subject: "Błąd płatności (#2048)"
  },
  {
    assignee: { avatarUrl: null, id: "u2", name: "Marek Nowak" },
    createdAt: "2025-06-25T14:30:00.000Z",
    customer: "Initech",
    id: "t3",
    status: TicketStatus.RESOLVED,
    subject: "Prośba o zwrot środków (#4096)"
  }
];

const baseArgs = {
  direction: SortDirection.DESC,
  isPending: false,
  onSortChange: fn(),
  sort: TicketSortField.CREATED_AT,
  teammates: [],
  tickets
};

const meta = preview.meta({
  args: baseArgs,
  component: TicketsTable,
  decorators: [
    (Story) => (
      <SelectionProvider>
        <Story />
      </SelectionProvider>
    )
  ],
  parameters: {
    layout: "padded"
  },
  title: "Tickets/TicketsTable"
});

export const Default = meta.story({});

Default.test("Renders a row per ticket with status and assignee", async ({ canvas, step }) => {
  await step("Every ticket subject is visible", async () => {
    for (const ticket of tickets) {
      await expect(canvas.getByText(ticket.subject)).toBeVisible();
    }
  });

  await step("Status labels render as badges", async () => {
    await expect(canvas.getByText("Otwarte")).toBeVisible();
    await expect(canvas.getByText("Oczekujące")).toBeVisible();
    await expect(canvas.getByText("Rozwiązane")).toBeVisible();
  });

  await step("Unassigned ticket shows a dash", async () => {
    await expect(canvas.getByText("—")).toBeVisible();
  });
});

Default.test("Clicking a sortable header requests that sort field", async ({ canvas, args, userEvent, step }) => {
  await step("Click the 'Temat' header", async () => {
    await userEvent.click(canvas.getByRole("button", { name: /Temat/ }));
    await expect(args.onSortChange).toHaveBeenCalledWith(TicketSortField.SUBJECT);
  });

  await step("Click the 'Status' header", async () => {
    await userEvent.click(canvas.getByRole("button", { name: /Status/ }));
    await expect(args.onSortChange).toHaveBeenCalledWith(TicketSortField.STATUS);
  });
});

export const Empty = meta.story({
  args: { ...baseArgs, tickets: [] }
});

Empty.test("Shows the empty state when there are no tickets", async ({ canvas }) => {
  await expect(canvas.getByText(/Brak zgłoszeń/)).toBeVisible();
});

export const Pending = meta.story({
  args: { ...baseArgs, isPending: true }
});

Pending.test("Marks the body as busy while a navigation is pending", async ({ canvasElement }) => {
  const body = canvasElement.querySelector("tbody");
  await expect(body).toHaveAttribute("aria-busy", "true");
});
