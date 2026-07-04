"use client";

import { Badge } from "@szum-tech/design-system/components/badge";
import { Button } from "@szum-tech/design-system/components/button";
import { Checkbox } from "@szum-tech/design-system/components/checkbox";
import { Spinner } from "@szum-tech/design-system/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@szum-tech/design-system/components/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@szum-tech/design-system/components/tooltip";
import { cn } from "@szum-tech/design-system/utils";
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon, TriangleAlertIcon } from "lucide-react";
import { useSelection } from "~/features/tickets/context/selection.context";
import type { Teammate } from "~/features/tickets/types";
import type { FailureReason } from "~/features/tickets/types/bulk";
import { SortDirection, type TableQuery, type TicketSortField } from "~/features/tickets/types/table-query";
import type { TicketListItem } from "~/features/tickets/types/ticket";
import { isSelected, PageCheckboxState, pageCheckboxState } from "~/features/tickets/utils/selection";
import {
  FAILURE_REASON_LABELS,
  formatTicketDate,
  STATUS_BADGE_VARIANT,
  STATUS_LABELS
} from "~/features/tickets/utils/ticket-presentation";
import { TeammateItem } from "./teammate-item";

type TicketsTableProps = {
  tickets: Array<TicketListItem>;
  sort: TableQuery["sort"];
  direction: TableQuery["direction"];
  isPending: boolean;
  teammates: Array<Teammate>;
  /** Ids currently in flight for a bulk request — rendered dimmed with a spinner instead of a checkbox. */
  pendingIds: ReadonlySet<string>;
  /** Ids still selected after a partial failure, with the reason — rendered with an error marker. */
  failedIds: ReadonlyMap<string, FailureReason>;
  onSortChange(field: TicketSortField): void;
};

type SortableHeaderProps = {
  field: TicketSortField;
  label: string;
  activeField: TicketSortField | null;
  direction: TableQuery["direction"];
  onSortChange(field: TicketSortField): void;
};

function SortableHeader({ field, label, activeField, direction, onSortChange }: SortableHeaderProps) {
  const isActive = activeField === field;
  const ariaSort = isActive ? (direction === SortDirection.ASC ? "ascending" : "descending") : "none";
  const icon = isActive ? (
    direction === SortDirection.ASC ? (
      <ChevronUpIcon />
    ) : (
      <ChevronDownIcon />
    )
  ) : (
    <ChevronsUpDownIcon className="text-muted-foreground" />
  );

  return (
    <TableHead aria-sort={ariaSort}>
      <Button
        className="-ml-3 h-8 gap-1 font-semibold"
        endIcon={icon}
        onClick={() => onSortChange(field)}
        size="sm"
        variant="ghost"
      >
        {label}
      </Button>
    </TableHead>
  );
}

/**
 * The ticket list table. Purely presentational for the data — sorting is delegated to the parent
 * (which owns the URL), the header just reflects and requests it. Row selection is read from and
 * written to the client-side selection store. Dims while a navigation is pending so the previous
 * page stays readable instead of flashing (a `keepPreviousData`-style feel).
 */
export function TicketsTable({
  tickets,
  sort,
  direction,
  isPending,
  onSortChange,
  teammates,
  pendingIds,
  failedIds
}: TicketsTableProps) {
  const { selection, dispatch } = useSelection();
  const pageIds = tickets.map((ticket) => ticket.id);
  const teammateById = new Map(teammates.map((teammate) => [teammate.id, teammate]));
  const headerState = pageCheckboxState(selection, pageIds);
  const headerChecked =
    headerState === PageCheckboxState.CHECKED
      ? true
      : headerState === PageCheckboxState.INDETERMINATE
        ? "indeterminate"
        : false;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              aria-label="Select current page"
              checked={headerChecked}
              disabled={pageIds.length === 0}
              onCheckedChange={(checked) =>
                dispatch(checked === true ? { pageIds, type: "SELECT_PAGE" } : { pageIds, type: "DESELECT_PAGE" })
              }
            />
          </TableHead>
          <SortableHeader
            activeField={sort}
            direction={direction}
            field="subject"
            label="Subject"
            onSortChange={onSortChange}
          />
          <TableHead>Customer</TableHead>
          <SortableHeader
            activeField={sort}
            direction={direction}
            field="status"
            label="Status"
            onSortChange={onSortChange}
          />
          <TableHead>Assignee</TableHead>
          <SortableHeader
            activeField={sort}
            direction={direction}
            field="createdAt"
            label="Created"
            onSortChange={onSortChange}
          />
        </TableRow>
      </TableHeader>
      <TableBody
        aria-busy={isPending}
        className={cn("transition-opacity", isPending && "pointer-events-none opacity-60")}
      >
        {tickets.length === 0 ? (
          <TableRow>
            <TableCell className="py-10 text-center text-muted-foreground" colSpan={6}>
              No tickets match the current filters.
            </TableCell>
          </TableRow>
        ) : (
          tickets.map((ticket) => {
            const selected = isSelected(selection, ticket.id);
            const assignee = ticket.assigneeId === null ? null : (teammateById.get(ticket.assigneeId) ?? null);
            const rowPending = pendingIds.has(ticket.id);
            const failureReason = failedIds.get(ticket.id);
            return (
              <TableRow
                aria-busy={rowPending}
                className={cn(selected && "bg-muted/40", rowPending && "pointer-events-none opacity-60")}
                data-state={selected ? "selected" : undefined}
                key={ticket.id}
              >
                <TableCell>
                  {rowPending ? (
                    <Spinner aria-label={`Processing ${ticket.subject}`} className="size-4" />
                  ) : (
                    <Checkbox
                      aria-label={`Select ticket ${ticket.subject}`}
                      checked={selected}
                      onCheckedChange={() => dispatch({ id: ticket.id, type: "TOGGLE_ROW" })}
                    />
                  )}
                </TableCell>
                <TableCell className="max-w-80 truncate font-medium">
                  <span className="flex items-center gap-1.5">
                    {failureReason ? (
                      <Tooltip>
                        <TooltipTrigger aria-label="Last action failed on this ticket" tabIndex={-1}>
                          <TriangleAlertIcon className="size-3.5 shrink-0 text-error" />
                        </TooltipTrigger>
                        <TooltipContent>{FAILURE_REASON_LABELS[failureReason]}</TooltipContent>
                      </Tooltip>
                    ) : null}
                    <span className="truncate">{ticket.subject}</span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{ticket.customer}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
                </TableCell>
                <TableCell>
                  <TeammateItem teammate={assignee} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatTicketDate(ticket.createdAt)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
