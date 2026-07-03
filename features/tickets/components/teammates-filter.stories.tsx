import * as React from "react";
import { expect, fn } from "storybook/test";
import preview from "~/.storybook/preview";
import { UNASSIGNED_TEAMMATE_ID } from "~/features/tickets/constants";
import type { Teammate } from "~/features/tickets/types/teammate";
import { TeammatesFilter } from "./teammates-filter";

const teammates: Array<Teammate> = [
  { avatarUrl: null, email: "anna@example.com", id: "u1", isAvailable: true, name: "Anna Smith" },
  { avatarUrl: null, email: "mark@example.com", id: "u2", isAvailable: true, name: "Mark Newman" },
  { avatarUrl: null, email: "ola@example.com", id: "u3", isAvailable: false, name: "Ola Bennett" }
];

/** `TeammatesFilter` is controlled — a small stateful wrapper is enough to exercise it in isolation. */
function ControlledFilter({
  onValueChange,
  initialValue = []
}: {
  onValueChange(ids: Array<string>): void;
  initialValue?: Array<string>;
}) {
  const [value, setValue] = React.useState(initialValue);

  return (
    <TeammatesFilter
      onValueChange={(ids) => {
        setValue(ids);
        onValueChange(ids);
      }}
      teammates={teammates}
      value={value}
    />
  );
}

const meta = preview.meta({
  args: { onValueChange: fn() },
  component: ControlledFilter,
  parameters: {
    layout: "padded"
  },
  title: "Tickets/TeammatesFilter"
});

export const Default = meta.story({});

Default.test(
  "selecting teammates and Unassigned updates the trigger summary",
  async ({ canvas, args, userEvent, step }) => {
    const trigger = canvas.getByRole("combobox");

    await step("Empty state shows the placeholder", async () => {
      await expect(canvas.getByText("Assignee")).toBeVisible();
    });

    await step("Selecting one teammate updates the summary and calls onValueChange", async () => {
      await userEvent.click(trigger);
      await userEvent.click(canvas.getByText("Anna Smith"));
      await expect(canvas.getByText("1 assignee")).toBeVisible();
      await expect(args.onValueChange).toHaveBeenLastCalledWith(["u1"]);
    });

    await step('Adding "Unassigned" combines with the existing selection', async () => {
      await userEvent.click(canvas.getByText("Unassigned"));
      await expect(canvas.getByText("2 assignees")).toBeVisible();
      await expect(args.onValueChange).toHaveBeenLastCalledWith(["u1", UNASSIGNED_TEAMMATE_ID]);
    });
  }
);

Default.test("search narrows the list by name", async ({ canvas, userEvent }) => {
  const trigger = canvas.getByRole("combobox");
  await userEvent.click(trigger);

  const searchInput = canvas.getByPlaceholderText("Search people…");
  await userEvent.type(searchInput, "mark");

  await expect(canvas.getByText("Mark Newman")).toBeVisible();
  await expect(canvas.queryByText("Anna Smith")).not.toBeInTheDocument();
});

export const Preselected = meta.story({
  args: { initialValue: ["u1", "u2"] }
});

Preselected.test("shows the combined count for a pre-existing selection", async ({ canvas }) => {
  await expect(canvas.getByText("2 assignees")).toBeVisible();
});
