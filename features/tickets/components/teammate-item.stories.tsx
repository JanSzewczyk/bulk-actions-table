/**
 * Test plan — TeammateItem
 *
 * 1. With a real teammate: name and email are visible, and the avatar fallback shows initials.
 * 2. With `teammate: null`: shows the "Unassigned" title and "No assignee" description.
 */
import { expect } from "storybook/test";
import preview from "~/.storybook/preview";
import { teammateBuilder } from "~/features/tickets/test/builders";
import type { Teammate } from "~/features/tickets/types/teammate";
import { TeammateItem } from "./teammate-item";

const meta = preview.meta({
  component: TeammateItem,
  parameters: {
    layout: "centered"
  },
  title: "Tickets/TeammateItem"
});

// avatarUrl: null forces the fallback to render deterministically instead of racing an image load.
const teammate: Teammate = teammateBuilder.one({
  overrides: { avatarUrl: null, email: "anna@example.com", name: "Anna Smith" }
});

export const AssignedTeammate = meta.story({
  args: { teammate }
});

AssignedTeammate.test("Shows the teammate's name, email, and avatar initials", async ({ canvas }) => {
  await expect(canvas.getByText("Anna Smith")).toBeVisible();
  await expect(canvas.getByText("anna@example.com")).toBeVisible();
  await expect(canvas.getByText("AS")).toBeVisible();
});

export const Unassigned = meta.story({
  args: { teammate: null }
});

Unassigned.test("Shows the unassigned placeholder", async ({ canvas }) => {
  await expect(canvas.getByText("Unassigned")).toBeVisible();
  await expect(canvas.getByText("No assignee")).toBeVisible();
});
