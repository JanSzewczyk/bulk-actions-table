import type { TableFilter } from "./table-query";

/**
 * Bulk action contract. One payload shape drives both the sync (`200`) and async (`202 { jobId }`)
 * response modes; only the execution mode changes with N.
 */

export const BulkAction = {
  ARCHIVE: "archive",
  ASSIGN: "assign",
  DELETE: "delete",
  RESTORE: "restore",
  UNASSIGN: "unassign"
} as const;

export type BulkAction = (typeof BulkAction)[keyof typeof BulkAction];

/** Per-element failure reasons. These are data errors, not contract errors. */
export const FailureReason = {
  CONFLICT: "conflict",
  NOT_FOUND: "not_found",
  TIMEOUT: "timeout",
  UNKNOWN: "unknown"
} as const;

export type FailureReason = (typeof FailureReason)[keyof typeof FailureReason];

export type FailureItem = {
  id: string;
  reason: FailureReason;
};

/** Sync response body — per-element outcome. */
export type BulkResult = {
  succeeded: Array<string>;
  failed: Array<FailureItem>;
};

/**
 * Deterministic error/latency simulation knobs. Server-side state only (`GET`/`PATCH
 * /api/dev/simulation`) — never part of a bulk request payload, so a client can't influence how its
 * own request is processed.
 */
export type SimulationParams = {
  failureRate: number;
  seed: number;
  concurrency: number;
};

export type BulkRequest = {
  action: BulkAction;
  /** Only for `action: 'assign'`. Validated server-side against the known teammate list. */
  assigneeId?: string;
} & ({ mode: "include"; ids: Array<string> } | { mode: "all"; filter: TableFilter; excluded: Array<string> });

/** Result of `executeBulkAction` — mirrors the endpoint's dual `200`/`202` response shape. */
export type BulkActionOutcome = { mode: "sync"; result: BulkResult } | { mode: "async"; jobId: string; total: number };
