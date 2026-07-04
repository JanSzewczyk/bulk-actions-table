/**
 * Test plan — JobProgressBar
 *
 * 1. In-progress job: shows the action's progress label, the "processed / total" counts, and the
 *    failure count, inside a `role="status"` / `aria-live="polite"` live region.
 * 2. Completed job: shows the completed counts and no failure text when `failedCount` is 0.
 */
import { expect } from "storybook/test";
import preview from "~/.storybook/preview";
import { BulkAction } from "~/features/tickets/types/bulk";
import { JobStatus } from "~/features/tickets/types/job";
import { JobProgressBar } from "./job-progress-bar";

const meta = preview.meta({
  component: JobProgressBar,
  parameters: {
    layout: "padded"
  },
  title: "Tickets/JobProgressBar"
});

export const InProgress = meta.story({
  args: {
    action: BulkAction.ARCHIVE,
    progress: { failedCount: 3, processed: 12, status: JobStatus.RUNNING, succeeded: 9, total: 50 }
  }
});

InProgress.test("Shows the action label, processed / total counts, and failure count", async ({ canvas }) => {
  await expect(canvas.getByText(/Archiving/)).toBeVisible();

  const counts = canvas.getByText(/12 \/ 50/);
  await expect(counts).toBeVisible();
  await expect(counts).toHaveTextContent("3 failed");
});

InProgress.test("Renders as a polite live region", async ({ canvas }) => {
  const status = canvas.getByRole("status");
  await expect(status).toHaveAttribute("aria-live", "polite");
});

export const Completed = meta.story({
  args: {
    action: BulkAction.DELETE,
    progress: { failedCount: 0, processed: 40, status: JobStatus.COMPLETED, succeeded: 40, total: 40 }
  }
});

Completed.test("Shows completed counts with no failure text", async ({ canvas }) => {
  await expect(canvas.getByText(/Deleting/)).toBeVisible();

  const counts = canvas.getByText(/40 \/ 40/);
  await expect(counts).toBeVisible();
  await expect(canvas.queryByText(/failed/)).not.toBeInTheDocument();
});
