import { describe, expect, test } from "vitest";
import { BulkAction } from "~/features/tickets/types/bulk";
import { JobStatus } from "~/features/tickets/types/job";
import {
  buildRestoreRequest,
  buildRetryRequest,
  formatBulkPartialFailureMessage,
  formatBulkSuccessMessage,
  formatDeleteUndoMessage,
  formatJobCompletedFailureMessage,
  formatJobCompletedSuccessMessage,
  formatJobProgressLabel,
  formatJobStartedMessage
} from "./bulk-outcome";

describe("buildRetryRequest", () => {
  test("keeps the source action and assignee, swapping in the given ids", () => {
    const request = buildRetryRequest(
      { action: BulkAction.ASSIGN, assigneeId: "user-1", ids: ["a", "b", "c"], mode: "include" },
      ["b", "c"]
    );

    expect(request).toEqual({ action: BulkAction.ASSIGN, assigneeId: "user-1", ids: ["b", "c"], mode: "include" });
  });

  test("carries an undefined assigneeId through for actions that don't need one", () => {
    const request = buildRetryRequest({ action: BulkAction.ARCHIVE, ids: ["a"], mode: "include" }, ["a"]);

    expect(request.assigneeId).toBeUndefined();
  });
});

describe("buildRestoreRequest", () => {
  test("builds a RESTORE request for the given ids", () => {
    expect(buildRestoreRequest(["a", "b"])).toEqual({ action: BulkAction.RESTORE, ids: ["a", "b"], mode: "include" });
  });
});

describe("formatJobStartedMessage", () => {
  test("formats the total with group separators", () => {
    expect(formatJobStartedMessage(1234)).toBe("Started a background job for 1,234 tickets.");
  });
});

describe("formatBulkSuccessMessage", () => {
  test("uses the action's past-tense verb and formats the count", () => {
    expect(formatBulkSuccessMessage(BulkAction.ARCHIVE, 3)).toBe("Archived 3 tickets.");
    expect(formatBulkSuccessMessage(BulkAction.ASSIGN, 1000)).toBe("Assigned 1,000 tickets.");
  });
});

describe("formatBulkPartialFailureMessage", () => {
  test("reports succeeded of total, with failed count", () => {
    expect(formatBulkPartialFailureMessage(BulkAction.UNASSIGN, 7, 3)).toBe("Unassigned 7 of 10 · 3 failed.");
  });
});

describe("formatDeleteUndoMessage", () => {
  test("formats the deleted count", () => {
    expect(formatDeleteUndoMessage(5)).toBe("Deleted 5 tickets.");
  });
});

describe("formatJobCompletedFailureMessage", () => {
  test("reports succeeded of total, with failed count", () => {
    const progress = { failedCount: 2, processed: 10, status: JobStatus.COMPLETED, succeeded: 8, total: 10 };

    expect(formatJobCompletedFailureMessage(progress)).toBe("Background job finished: 8 of 10 · 2 failed.");
  });
});

describe("formatJobCompletedSuccessMessage", () => {
  test("formats the succeeded count", () => {
    const progress = { failedCount: 0, processed: 10, status: JobStatus.COMPLETED, succeeded: 10, total: 10 };

    expect(formatJobCompletedSuccessMessage(progress)).toBe("Background job finished: 10 tickets.");
  });
});

describe("formatJobProgressLabel", () => {
  test("uses a present-continuous verb per action, read from the job rather than a generic label", () => {
    expect(formatJobProgressLabel(BulkAction.ARCHIVE)).toBe("Archiving…");
    expect(formatJobProgressLabel(BulkAction.ASSIGN)).toBe("Assigning…");
    expect(formatJobProgressLabel(BulkAction.DELETE)).toBe("Deleting…");
    expect(formatJobProgressLabel(BulkAction.RESTORE)).toBe("Restoring…");
    expect(formatJobProgressLabel(BulkAction.UNASSIGN)).toBe("Unassigning…");
  });
});
