// Barrel — client-safe constants for the tickets domain.
import { SortDirection, TicketSortField } from "../types/table-query";

/** Rows per page in the table. The header checkbox selects this many at once. */
export const PAGE_SIZE = 25;

/** Selectable page sizes exposed by the table controls. */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** Fixed worker-pool concurrency for the async job — imitates a connection pool. */
export const DEFAULT_CONCURRENCY = 5;

/** Default deterministic seed the dev panel starts with; overridable via env `DATASET_SEED`. */
export const DEFAULT_SEED = 12345;

/** Default failure rate offered by the dev panel (0 / 0.1 / 0.5). */
export const DEFAULT_FAILURE_RATE = 0.1;

/** How long the delete undo-toast stays before the soft-delete becomes final (~7s). */
export const UNDO_WINDOW_MS = 7000;

/** Job polling cadence. */
export const JOB_POLL_INTERVAL_MS = 1000;

/** sessionStorage key used to resume polling after a page refresh mid-job. */
export const ACTIVE_JOB_STORAGE_KEY = "tickets:active-job";

export const DEFAULT_SORT = {
  direction: SortDirection.DESC,
  field: TicketSortField.CREATED_AT
} as const;
