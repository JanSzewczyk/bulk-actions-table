"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { Field } from "@szum-tech/design-system/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@szum-tech/design-system/components/input-group";
import { Select, SelectContent, SelectItem } from "@szum-tech/design-system/components/select";
import { Spinner } from "@szum-tech/design-system/components/spinner";
import { FilterXIcon, SearchIcon, XIcon } from "lucide-react";
import * as React from "react";
import type { TableQuery } from "~/features/tickets/types/table-query";
import type { Teammate } from "~/features/tickets/types/teammate";
import { type TicketStatus, TicketStatuses } from "~/features/tickets/types/ticket";
import { STATUS_LABELS } from "~/features/tickets/utils/ticket-presentation";
import { TeammatesFilter } from "./teammates-filter";

const ALL_STATUSES = "ALL";
const SEARCH_DEBOUNCE_MS = 350;

type TableControlsProps = {
  query: TableQuery;
  teammates: Array<Teammate>;
  isPending: boolean;
  onQueryChange(patch: Partial<TableQuery>): void;
};

/**
 * Filter/search controls above the table. The status filter pushes a new URL immediately; the search
 * box debounces so typing does not fire a navigation per keystroke. The input is locally controlled
 * but re-syncs whenever the committed query (`query.q`) changes underneath it — except when that
 * change is just the round trip of our own last debounced commit landing. Without that guard, typing
 * fast enough to outrun the navigation round trip meant the resync effect would stomp the newer
 * keystrokes with the stale value that had just been pushed, making characters randomly disappear.
 */
export function TableControls({ query, teammates, isPending, onQueryChange }: TableControlsProps) {
  const [search, setSearch] = React.useState(query.q ?? "");
  const lastCommittedRef = React.useRef(query.q ?? null);
  const hasActiveFilters = query.status !== null || query.q !== null || (query.assigneeIds?.length ?? 0) > 0;

  // Re-sync when the URL changes from elsewhere (back/forward, clear, another filter resetting it).
  React.useEffect(() => {
    if (query.q === lastCommittedRef.current) {
      return;
    }
    lastCommittedRef.current = query.q ?? null;
    setSearch(query.q ?? "");
  }, [query.q]);

  // Debounce committing the search term to the URL.
  React.useEffect(() => {
    const trimmed = search.trim();
    const nextValue = trimmed.length > 0 ? trimmed : null;
    if (nextValue === lastCommittedRef.current) {
      return;
    }
    const timeout = setTimeout(() => {
      lastCommittedRef.current = nextValue;
      onQueryChange({ q: nextValue });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, onQueryChange]);

  function handleClearFilters() {
    lastCommittedRef.current = null;
    setSearch("");
    onQueryChange({ assigneeIds: null, q: null, status: null });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field className="max-w-xs">
        <InputGroup>
          <InputGroupInput onChange={(event) => setSearch(event.target.value)} placeholder="Search..." value={search} />
          <InputGroupAddon>{isPending ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
          {search.length > 0 ? (
            <InputGroupAddon align="inline-end">
              <Button aria-label="Clear search" onClick={() => setSearch("")} size="icon-xs" variant="ghost">
                <XIcon />
              </Button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </Field>

      <Field className="w-52">
        <Select
          disabled={isPending}
          onValueChange={(value) => onQueryChange({ status: value === ALL_STATUSES ? null : (value as TicketStatus) })}
          value={query.status ?? ALL_STATUSES}
        >
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {TicketStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <TeammatesFilter
        disabled={isPending}
        onValueChange={(assigneeIds) => onQueryChange({ assigneeIds: assigneeIds.length > 0 ? assigneeIds : null })}
        teammates={teammates}
        value={query.assigneeIds ?? []}
      />

      {hasActiveFilters ? (
        <Button
          className="ml-auto"
          disabled={isPending}
          onClick={handleClearFilters}
          size="sm"
          startIcon={<FilterXIcon />}
          variant="ghost"
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
