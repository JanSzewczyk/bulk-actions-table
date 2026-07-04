// Barrel — client-safe constants for the tickets domain.

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

/** Fixed id of the static teammate representing the current user — never part of the seeded/generated range. */
export const CURRENT_USER_ID = "me";

/**
 * Sentinel id for "no assignee" in the assignee filter's value — combines freely with real teammate
 * ids (OR semantics: "assigned to A, B, or nobody"). Shared between the client filter component and
 * the server-side matcher, so it lives here rather than in a client-only component file.
 */
export const UNASSIGNED_TEAMMATE_ID = "unassigned";

/**
 * When an `all`-mode selection's `excluded` set covers at least this fraction of `total` (and at
 * least `EXCLUDED_COUNT_WARNING_THRESHOLD` rows), the banner nudges the user toward an explicit
 * `include` selection instead. The API contract stays correct either way — `excluded` payload size
 * just stops being smaller than an equivalent `include` list once this many rows are hand-deselected.
 */
export const EXCLUDED_RATIO_WARNING_THRESHOLD = 0.9;

/** Minimum absolute `excluded` size before the ratio warning can fire — avoids noise on small totals. */
export const EXCLUDED_COUNT_WARNING_THRESHOLD = 50;
