"use client";

import { toast } from "@szum-tech/design-system/components/toaster";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useSelection } from "~/features/tickets/hooks/use-selection";
import { mergeTableQuery, stringifyTableQuery } from "~/features/tickets/lib/table-query-url";
import type { Teammate } from "~/features/tickets/types";
import { SelectionMode } from "~/features/tickets/types/selection";
import {
  type Pagination,
  SortDirection,
  type TableFilter,
  type TableQuery,
  type TicketSortField
} from "~/features/tickets/types/table-query";
import type { TicketListItem } from "~/features/tickets/types/ticket";
import { BulkToolbar } from "./bulk-toolbar";
import { SelectionBanner } from "./selection-banner";
import { TableControls } from "./table-controls";
import { TablePagination } from "./table-pagination";
import { TicketsTable } from "./tickets-table";

type TicketsTableSectionProps = {
  tickets: Array<TicketListItem>;
  pagination: Pagination;
  query: TableQuery;
  teammates: Array<Teammate>;
};

export function TicketsTableSection({ tickets, pagination, query, teammates }: TicketsTableSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const { selection, dispatch } = useSelection();

  const filter: TableFilter = { q: query.q, status: query.status };
  const pageIds = tickets.map((ticket) => ticket.id);

  // Reset an `all` selection when the filter changes (it is scoped to the filter it was made under),
  // and tell the user why. An `include` selection is left untouched by the reducer.
  const previousFilterRef = React.useRef(filter);
  React.useEffect(() => {
    const previous = previousFilterRef.current;
    const nextFilter: TableFilter = { q: query.q, status: query.status };
    if (previous.status === nextFilter.status && previous.q === nextFilter.q) {
      return;
    }
    if (selection.mode === SelectionMode.ALL) {
      toast.info("Zaznaczenie wyczyszczone po zmianie filtra.");
    }
    dispatch({ filter: nextFilter, type: "FILTER_CHANGED" });
    previousFilterRef.current = nextFilter;
  }, [query.q, query.status, selection.mode, dispatch]);

  function applyQuery(patch: Partial<TableQuery>) {
    const nextQuery = mergeTableQuery(query, patch);
    const queryString = stringifyTableQuery(nextQuery);
    startTransition(() => router.push(queryString.length > 0 ? `${pathname}?${queryString}` : pathname));
  }

  function handleSortChange(field: TicketSortField) {
    const nextDirection =
      query.sort === field && query.direction === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC;
    applyQuery({ direction: nextDirection, sort: field });
  }

  return (
    <div className="flex flex-col gap-4">
      <TableControls isPending={isPending} onQueryChange={applyQuery} query={query} />
      <BulkToolbar outsideFilterCount={0} total={pagination.total} />
      <SelectionBanner filter={filter} pageIds={pageIds} total={pagination.total} />
      <TicketsTable
        direction={query.direction}
        isPending={isPending}
        onSortChange={handleSortChange}
        sort={query.sort}
        teammates={teammates}
        tickets={tickets}
      />
      <TablePagination isPending={isPending} onQueryChange={applyQuery} pagination={pagination} query={query} />
    </div>
  );
}
