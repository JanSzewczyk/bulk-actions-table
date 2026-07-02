import "server-only";

import type { BulkAction } from "~/features/tickets/types/bulk";
import { JobStatus } from "~/features/tickets/types/job";
import { getStore } from "./store";

/** Creates a `RUNNING` job record and returns its id. A background runner fills in its progress. */
export function createJob(action: BulkAction, total: number): string {
  const id = crypto.randomUUID();
  getStore().jobs.set(id, {
    action,
    failedCount: 0,
    failures: [],
    id,
    processed: 0,
    status: JobStatus.RUNNING,
    succeeded: 0,
    total
  });
  return id;
}
