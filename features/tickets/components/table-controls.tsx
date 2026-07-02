"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { Field } from "@szum-tech/design-system/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@szum-tech/design-system/components/input-group";
import { Select, SelectContent, SelectItem } from "@szum-tech/design-system/components/select";
import { Spinner } from "@szum-tech/design-system/components/spinner";
import { SearchIcon, XIcon } from "lucide-react";
import * as React from "react";
import { STATUS_LABELS } from "~/features/tickets/lib/ticket-presentation";
import type { TableQuery } from "~/features/tickets/types/table-query";
import { type TicketStatus, TicketStatuses } from "~/features/tickets/types/ticket";

const ALL_STATUSES = "ALL";
const SEARCH_DEBOUNCE_MS = 350;

type TableControlsProps = {
  query: TableQuery;
  isPending: boolean;
  onQueryChange(patch: Partial<TableQuery>): void;
};

/**
 * Filter/search controls above the table. The status filter pushes a new URL immediately; the search
 * box debounces so typing does not fire a navigation per keystroke. The input is locally controlled
 * but re-syncs whenever the committed query (`query.q`) changes underneath it.
 */
export function TableControls({ query, isPending, onQueryChange }: TableControlsProps) {
  const [search, setSearch] = React.useState(query.q ?? "");

  // Re-sync when the URL changes from elsewhere (back/forward, clear).
  React.useEffect(() => {
    setSearch(query.q ?? "");
  }, [query.q]);

  // Debounce committing the search term to the URL.
  React.useEffect(() => {
    const trimmed = search.trim();
    const nextValue = trimmed.length > 0 ? trimmed : null;
    if (nextValue === query.q) {
      return;
    }
    const timeout = setTimeout(() => onQueryChange({ q: nextValue }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, query.q, onQueryChange]);

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
            <SelectItem value={ALL_STATUSES}>Wszystkie statusy</SelectItem>
            {TicketStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
