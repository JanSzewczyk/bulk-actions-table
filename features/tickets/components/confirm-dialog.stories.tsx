/**
 * Test plan — ConfirmDialog
 *
 * 1. Renders title, description, and confirm label once opened.
 * 2. Clicking the confirm action calls `onConfirm`.
 * 3. Clicking cancel calls `onOpenChange(false)` and does not call `onConfirm`.
 *
 * `ConfirmDialog` is fully controlled by `open` and has no internal state, so a small stateful
 * wrapper (`ControlledConfirmDialog`) drives it — a trigger button flips `open` to `true`, mirroring
 * the `ControlledFilter` pattern used for `TeammatesFilter`.
 */
import * as React from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import preview from "~/.storybook/preview";
import { ConfirmDialog } from "./confirm-dialog";

function ControlledConfirmDialog({
  onOpenChange,
  onConfirm
}: {
  onOpenChange(open: boolean): void;
  onConfirm(): void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Delete tickets
      </button>
      <ConfirmDialog
        confirmLabel="Delete"
        description="This will permanently delete the selected tickets."
        onConfirm={onConfirm}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange(next);
        }}
        open={open}
        title="Delete selected tickets?"
      />
    </>
  );
}

const meta = preview.meta({
  args: { onConfirm: fn(), onOpenChange: fn() },
  component: ControlledConfirmDialog,
  parameters: {
    layout: "centered"
  },
  title: "Tickets/ConfirmDialog"
});

export const ConfirmDialogStory = meta.story({ name: "Confirm Dialog" });

ConfirmDialogStory.test("Renders title, description, and confirm label when open", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /delete tickets/i }));
  await screen.findByRole("alertdialog");

  await waitFor(() => expect(screen.getByRole("heading", { name: /delete selected tickets\?/i })).toBeVisible());
  await waitFor(() => expect(screen.getByText(/this will permanently delete the selected tickets/i)).toBeVisible());
  await waitFor(() => expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible());
});

ConfirmDialogStory.test("Clicking confirm calls onConfirm", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /delete tickets/i }));
  await screen.findByRole("alertdialog");

  await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));

  await expect(args.onConfirm).toHaveBeenCalledOnce();
});

ConfirmDialogStory.test("Clicking cancel closes the dialog without confirming", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /delete tickets/i }));
  await screen.findByRole("alertdialog");

  await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

  await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
  await expect(args.onConfirm).not.toHaveBeenCalled();
});
