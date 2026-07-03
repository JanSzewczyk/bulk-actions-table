import * as React from "react";
import { expect } from "storybook/test";
import preview from "~/.storybook/preview";
import { SelectionProvider } from "~/features/tickets/context/selection.context";
import type { TableFilter } from "~/features/tickets/types/table-query";
import type { TicketListItem } from "~/features/tickets/types/ticket";
import { TicketStatus } from "~/features/tickets/types/ticket";
import { SelectionBanner } from "./selection-banner";
import { TicketsTable } from "./tickets-table";

const NO_FILTER: TableFilter = { assigneeIds: null, q: null, status: null };

function makeTickets(prefix: string): Array<TicketListItem> {
  return [1, 2, 3].map((n) => ({
    assigneeId: null,
    createdAt: "2025-06-30T10:15:00.000Z",
    customer: `Customer ${prefix}${n}`,
    id: `${prefix}${n}`,
    status: TicketStatus.OPEN,
    subject: `Ticket ${prefix}${n}`
  }));
}

const pageOneTickets = makeTickets("p1-");
const pageTwoTickets = makeTickets("p2-");

/**
 * Two fake 3-row "pages" sharing one `SelectionProvider`, with a button that swaps which page is
 * rendered — close enough to real pagination (a new set of rows under the same client-side selection
 * store) to reproduce the cross-page banner bug without needing the full table section/URL wiring.
 */
function TwoPageHarness() {
  const [page, setPage] = React.useState<1 | 2>(1);
  const tickets = page === 1 ? pageOneTickets : pageTwoTickets;
  const pageIds = tickets.map((ticket) => ticket.id);

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => setPage(page === 1 ? 2 : 1)} type="button">
        Go to page {page === 1 ? 2 : 1}
      </button>
      {/* `total` is 10 (not 6) so the "select all matching" escalation stays offered after both fake
      pages are fully selected — otherwise `total > selected` would go false and the banner would
      disappear right at the point the regression under test would have been visible. */}
      <SelectionBanner filter={NO_FILTER} pageIds={pageIds} total={10} />
      <TicketsTable
        direction={null}
        failedIds={new Map()}
        isPending={false}
        onSortChange={() => {}}
        pendingIds={new Set()}
        sort={null}
        teammates={[]}
        tickets={tickets}
      />
    </div>
  );
}

const meta = preview.meta({
  component: TwoPageHarness,
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
  title: "Tickets/SelectionBanner"
});

export const Default = meta.story({});

/**
 * The banner's count is split across text nodes by a `<strong>` (`Selected <strong>3</strong> on this
 * page.`), so a plain string `getByText` never matches — RTL only matches a node's own concatenated
 * `textContent`, and the closest element with that exact full text is the wrapping `<span>`. A function
 * matcher pins the match to that one element instead of guessing at a selector.
 */
function bannerTextEquals(text: string) {
  return (_content: string, element: Element | null) => element?.textContent === text;
}

Default.test(
  "reports only the current page's count after selecting a whole page, navigating, and selecting another",
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select current page" }));
    await expect(canvas.getByText(bannerTextEquals("Selected 3 on this page."))).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Go to page 2" }));
    // Page 2's rows aren't selected yet, so the whole-page condition isn't met — no escalation banner.
    await expect(canvas.queryByText(/on this page/)).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole("checkbox", { name: "Select current page" }));
    // 6 ids are selected in total across both pages, but only 3 of them are on the current page (page
    // 2) — the banner must report 3, not the cross-page total of 6.
    await expect(canvas.getByText(bannerTextEquals("Selected 3 on this page."))).toBeVisible();
    await expect(canvas.queryByText(bannerTextEquals("Selected 6 on this page."))).not.toBeInTheDocument();
  }
);
