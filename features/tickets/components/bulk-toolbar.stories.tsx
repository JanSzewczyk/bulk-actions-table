/**
 * Test plan for BulkToolbar:
 *
 * The toolbar renders nothing until `useSelection()` reports an active selection, so every story
 * wraps a small harness that dispatches into `SelectionProvider` on mount before rendering the real
 * component — either an `include` selection (explicit ids) or an escalated `all` selection (matches
 * a filter). Confirmation behaviour is the core branch to cover: `include` mode never confirms
 * Archive/Assign/Unassign (submits straight away), `all` mode always confirms every action, and
 * Delete confirms unconditionally in both modes.
 *
 * 1. Include-mode selection — content, Archive submits directly, Delete always confirms (cancel +
 *    confirm paths), Assign submits directly with the right assigneeId, Clear selection dispatches
 *    CLEAR and the toolbar disappears.
 * 2. All-mode selection ("select all matching") — Archive/Unassign/Assign each require confirmation
 *    describing the filter scope, cancelling doesn't submit, Delete's confirmation also describes the
 *    filter scope (not the include-mode "outside filter" note).
 * 3. Submitting/job-running state — every action button and the assign trigger are disabled.
 */

import * as React from "react";
import { expect, fn, mocked, screen, waitFor } from "storybook/test";
import preview from "~/.storybook/preview";
import { SelectionProvider, useSelection } from "~/features/tickets/context/selection.context";
import { teammateBuilder } from "~/features/tickets/test/builders";
import { BulkAction } from "~/features/tickets/types/bulk";
import type { TableFilter } from "~/features/tickets/types/table-query";
import { TicketStatus } from "~/features/tickets/types/ticket";
import { BulkToolbar } from "./bulk-toolbar";

const NO_FILTER: TableFilter = { assigneeIds: null, q: null, status: null };
const ALL_MODE_FILTER: TableFilter = { assigneeIds: null, q: null, status: TicketStatus.OPEN };

const teammates = [
  teammateBuilder.one({ overrides: { isAvailable: true, name: "Anna Smith" } }),
  teammateBuilder.one({ overrides: { isAvailable: true, name: "Mark Newman" } })
];

type ToolbarProps = React.ComponentProps<typeof BulkToolbar>;

/**
 * Drives a real selection into the provider before rendering `BulkToolbar`, so tests exercise the
 * component the way the real table does (selection lives in context, not props). `selectedIds`
 * dispatches an `include` selection; `selectAllMatchingFilter` escalates straight to `all` mode.
 */
function BulkToolbarHarness({
  selectedIds,
  selectAllMatchingFilter,
  ...toolbarProps
}: ToolbarProps & { selectedIds?: Array<string>; selectAllMatchingFilter?: TableFilter }) {
  const { dispatch } = useSelection();

  // Runs once on mount to seed the selection this story needs — `selectedIds` /
  // `selectAllMatchingFilter` are fixed per story and never change after the initial render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only
  React.useEffect(() => {
    if (selectAllMatchingFilter) {
      dispatch({ filter: selectAllMatchingFilter, type: "SELECT_ALL_MATCHING" });
      return;
    }
    if (selectedIds) {
      dispatch({ pageIds: selectedIds, type: "SELECT_PAGE" });
    }
  }, []);

  return <BulkToolbar {...toolbarProps} />;
}

const meta = preview.meta({
  args: {
    filter: NO_FILTER,
    isSubmitting: false,
    jobRunning: false,
    onSubmit: fn(),
    outsideFilterCount: 0,
    teammates,
    total: 8
  },
  beforeEach: async ({ args }) => {
    mocked(args.onSubmit).mockClear();
  },
  component: BulkToolbarHarness,
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
  title: "Tickets/BulkToolbar"
});

export const IncludeModeSelection = meta.story({
  args: {
    outsideFilterCount: 2,
    selectedIds: ["t1", "t2", "t3"],
    total: 8
  }
});

IncludeModeSelection.test("Renders selection count, outside-filter note, and all actions", async ({ canvas }) => {
  await expect(await canvas.findByText(/Selected 3/)).toBeVisible();
  await expect(canvas.getByText(/2 outside the current filter/)).toBeVisible();
  await expect(canvas.getByRole("button", { name: "Archive" })).toBeVisible();
  await expect(canvas.getByRole("button", { name: /Assign to/ })).toBeVisible();
  await expect(canvas.getByRole("button", { name: "Delete" })).toBeVisible();
  await expect(canvas.getByRole("button", { name: "Clear selection" })).toBeVisible();
});

IncludeModeSelection.test(
  "Archive submits immediately without a confirmation dialog",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Archive" }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      action: BulkAction.ARCHIVE,
      assigneeId: undefined,
      ids: ["t1", "t2", "t3"],
      mode: "include"
    });
    await expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  }
);

IncludeModeSelection.test(
  "Delete always requires confirmation — cancel then confirm",
  async ({ canvas, userEvent, args, step }) => {
    await step("Cancelling the confirmation does not submit", async () => {
      await userEvent.click(await canvas.findByRole("button", { name: "Delete" }));
      const dialog = await screen.findByRole("alertdialog");
      await expect(dialog).toHaveTextContent(/2 of them are outside the current filter/);

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
      await expect(args.onSubmit).not.toHaveBeenCalled();
    });

    await step("Confirming submits the delete request", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Delete" }));
      await screen.findByRole("alertdialog");

      await userEvent.click(screen.getByRole("button", { name: "Delete" }));
      await expect(args.onSubmit).toHaveBeenCalledWith({
        action: BulkAction.DELETE,
        assigneeId: undefined,
        ids: ["t1", "t2", "t3"],
        mode: "include"
      });
      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    });
  }
);

IncludeModeSelection.test(
  "Assigning to a teammate submits directly with their id",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Assign to/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Anna Smith/ }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      action: BulkAction.ASSIGN,
      assigneeId: teammates[0]?.id,
      ids: ["t1", "t2", "t3"],
      mode: "include"
    });
    await expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  }
);

IncludeModeSelection.test(
  "Clearing the selection dispatches CLEAR and the toolbar disappears",
  async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Clear selection" }));

    await expect(canvas.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  }
);

export const AllModeSelection = meta.story({
  args: {
    filter: ALL_MODE_FILTER,
    outsideFilterCount: 0,
    selectAllMatchingFilter: ALL_MODE_FILTER,
    total: 500
  }
});

AllModeSelection.test(
  "Archive requires confirmation describing the filter scope, then submits on confirm",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Archive" }));

    const dialog = await screen.findByRole("alertdialog");
    await expect(dialog).toHaveTextContent(/Matches status: Open/);
    await expect(dialog).toHaveTextContent(/not just the current page/);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      action: BulkAction.ARCHIVE,
      assigneeId: undefined,
      excluded: [],
      filter: ALL_MODE_FILTER,
      mode: "all"
    });
  }
);

AllModeSelection.test("Cancelling an all-mode confirmation does not submit", async ({ canvas, userEvent, args }) => {
  await userEvent.click(await canvas.findByRole("button", { name: /Assign to/ }));
  await userEvent.click(await screen.findByRole("menuitem", { name: /Unassigned/ }));

  const dialog = await screen.findByRole("alertdialog");
  await waitFor(() => expect(dialog).toBeVisible());

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  await expect(args.onSubmit).not.toHaveBeenCalled();
});

AllModeSelection.test(
  "Delete's confirmation describes the filter scope instead of an outside-filter count",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("alertdialog");
    await expect(dialog).toHaveTextContent(/Matches status: Open/);
    await expect(dialog).not.toHaveTextContent(/outside the current filter/);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      action: BulkAction.DELETE,
      assigneeId: undefined,
      excluded: [],
      filter: ALL_MODE_FILTER,
      mode: "all"
    });
  }
);

AllModeSelection.test(
  "Assigning to a teammate requires confirmation with the right assigneeId",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Assign to/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Mark Newman/ }));

    const dialog = await screen.findByRole("alertdialog");
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      action: BulkAction.ASSIGN,
      assigneeId: teammates[1]?.id,
      excluded: [],
      filter: ALL_MODE_FILTER,
      mode: "all"
    });
  }
);

export const SubmittingState = meta.story({
  args: {
    isSubmitting: true,
    selectedIds: ["t1"],
    total: 8
  }
});

SubmittingState.test("Disables every action while a request is in flight", async ({ canvas }) => {
  await expect(await canvas.findByRole("button", { name: "Archive" })).toBeDisabled();
  await expect(canvas.getByRole("button", { name: /Assign to/ })).toBeDisabled();
  await expect(canvas.getByRole("button", { name: "Delete" })).toBeDisabled();
});
