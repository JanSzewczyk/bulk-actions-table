"use client";

import { Badge } from "@szum-tech/design-system/components/badge";
import { Button } from "@szum-tech/design-system/components/button";
import { Checkbox } from "@szum-tech/design-system/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@szum-tech/design-system/components/table";
import { cn } from "@szum-tech/design-system/utils";
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon } from "lucide-react";
import { useSelection } from "~/features/tickets/hooks/use-selection";
import { isSelected, PageCheckboxState, pageCheckboxState } from "~/features/tickets/lib/selection";
import { formatTicketDate, STATUS_BADGE_VARIANT, STATUS_LABELS } from "~/features/tickets/lib/ticket-presentation";
import type { Teammate } from "~/features/tickets/types";
import { SortDirection, type TableQuery, type TicketSortField } from "~/features/tickets/types/table-query";
import type { TicketListItem } from "~/features/tickets/types/ticket";
import { TeammateItem } from "./teammate-item";

type TicketsTableProps = {
  tickets: Array<TicketListItem>;
  sort: TableQuery["sort"];
  direction: TableQuery["direction"];
  isPending: boolean;
  teammates: Array<Teammate>;
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
export function TicketsTable({ tickets, sort, direction, isPending, onSortChange, teammates }: TicketsTableProps) {
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
            return (
              <TableRow
                className={cn(selected && "bg-muted/40")}
                data-state={selected ? "selected" : undefined}
                key={ticket.id}
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select ticket ${ticket.subject}`}
                    checked={selected}
                    onCheckedChange={() => dispatch({ id: ticket.id, type: "TOGGLE_ROW" })}
                  />
                </TableCell>
                <TableCell className="max-w-80 truncate font-medium">{ticket.subject}</TableCell>
                <TableCell className="text-muted-foreground">{ticket.customer}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
                </TableCell>
                <TableCell>
                  {assignee === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <TeammateItem teammate={assignee} />
                  )}
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
