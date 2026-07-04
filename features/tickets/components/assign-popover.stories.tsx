import { expect, fn, screen, waitFor } from "storybook/test";
import preview from "~/.storybook/preview";
import { CURRENT_USER_ID } from "~/features/tickets/constants";
import { teammateBuilder } from "~/features/tickets/test/builders";
import type { Teammate } from "~/features/tickets/types/teammate";
import { AssignPopover } from "./assign-popover";

// Sorted by first name: Anna, Ben, Mark, Ola — asserted against directly, so ids/names are fixed.
const teammates: Array<Teammate> = [
  teammateBuilder.one({
    overrides: { avatarUrl: null, email: "anna@example.com", id: "u1", isAvailable: true, name: "Anna Smith" }
  }),
  // Shares an id with CURRENT_USER_ID to exercise the "You" badge.
  teammateBuilder.one({
    overrides: {
      avatarUrl: null,
      email: "ben@example.com",
      id: CURRENT_USER_ID,
      isAvailable: true,
      name: "Ben Carter"
    }
  }),
  teammateBuilder.one({
    overrides: { avatarUrl: null, email: "mark@example.com", id: "u3", isAvailable: true, name: "Mark Newman" }
  }),
  // Unavailable — exercises the disabled item + "unavailable" label.
  teammateBuilder.one({
    overrides: { avatarUrl: null, email: "ola@example.com", id: "u4", isAvailable: false, name: "Ola Bennett" }
  })
];

const meta = preview.meta({
  args: { disabled: false, onAssign: fn(), onUnassign: fn(), teammates },
  component: AssignPopover,
  parameters: {
    layout: "padded"
  },
  title: "Tickets/Assign Popover"
});

export const TeammatePicker = meta.story({});

TeammatePicker.test(
  "Opening the trigger lists Unassigned followed by teammates sorted by first name",
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /assign to/i }));

    const items = await screen.findAllByRole("menuitem");
    await expect(items).toHaveLength(5);
    await expect(items[0]).toHaveTextContent("Unassigned");
    await expect(items[1]).toHaveTextContent("Anna Smith");
    await expect(items[2]).toHaveTextContent("Ben Carter");
    await expect(items[3]).toHaveTextContent("Mark Newman");
    await expect(items[4]).toHaveTextContent("Ola Bennett");
  }
);

TeammatePicker.test("Typing in the search field filters the list by name", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /assign to/i }));

  const searchInput = await screen.findByRole("textbox", { name: /search people/i });
  await userEvent.type(searchInput, "mark");

  await expect(screen.getByText("Mark Newman")).toBeVisible();
  await expect(screen.queryByText("Anna Smith")).not.toBeInTheDocument();
});

TeammatePicker.test(
  "Clicking a teammate calls onAssign with that teammate's id",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /assign to/i }));

    await userEvent.click(await screen.findByText("Anna Smith"));

    await expect(args.onAssign).toHaveBeenCalledWith("u1");
  }
);

TeammatePicker.test("Clicking Unassigned calls onUnassign", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /assign to/i }));

  await userEvent.click(await screen.findByText("Unassigned"));

  await expect(args.onUnassign).toHaveBeenCalled();
});

TeammatePicker.test(
  "An unavailable teammate's menu item is disabled and shows 'unavailable'",
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /assign to/i }));

    const olaItem = await screen.findByRole("menuitem", { name: /ola bennett/i });
    await expect(olaItem).toHaveTextContent("unavailable");
    await expect(olaItem).toHaveAttribute("data-disabled");
  }
);

TeammatePicker.test("The teammate matching CURRENT_USER_ID shows a You badge", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /assign to/i }));

  // Scope to the stable `menuitem` role (as the other tests in this file do) rather than a leaf
  // `getByText` — the other passing test in this file already proves "Ben Carter" renders with the
  // right text content at this role/position, so we only need to assert the "You" badge is present.
  const benItem = await screen.findByRole("menuitem", { name: /ben carter/i });
  await waitFor(() => expect(benItem).toHaveTextContent("You"));
});

export const DisabledTrigger = meta.story({
  args: { disabled: true }
});

DisabledTrigger.test("Trigger button is disabled when disabled is true", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /assign to/i })).toBeDisabled();
});
