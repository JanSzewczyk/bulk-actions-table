import { DEFAULT_SORT, PAGE_SIZE } from "~/features/tickets/constants";
import type { TableQuery } from "~/features/tickets/types/table-query";

/**
 * Client-safe helpers for turning table state into a URL query string and back.
 *
 * Default values are omitted from the URL so shared links stay short and a pristine table lives at
 * the bare path. The server parser fills the same defaults back in, so the round-trip is lossless.
 */

export function stringifyTableQuery(query: TableQuery): string {
  const params = new URLSearchParams();

  if (query.page !== 1) {
    params.set("page", String(query.page));
  }
  if (query.size !== PAGE_SIZE) {
    params.set("size", String(query.size));
  }
  if (query.sort !== DEFAULT_SORT.field) {
    params.set("sort", query.sort);
  }
  if (query.direction !== DEFAULT_SORT.direction) {
    params.set("direction", query.direction);
  }
  if (query.status !== null) {
    params.set("status", query.status);
  }
  if (query.q !== null) {
    params.set("q", query.q);
  }

  return params.toString();
}

/**
 * Merges a patch into the current table state. Any change other than paging resets to page 1, so a
 * new filter/sort/search never lands the user on a now-out-of-range page.
 */
export function mergeTableQuery(current: TableQuery, patch: Partial<TableQuery>): TableQuery {
  const next: TableQuery = { ...current, ...patch };

  const changedBeyondPage = Object.keys(patch).some((key) => key !== "page");
  if (changedBeyondPage && patch.page === undefined) {
    next.page = 1;
  }

  return next;
}
