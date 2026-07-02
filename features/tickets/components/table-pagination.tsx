"use client";

import { Field, FieldLabel } from "@szum-tech/design-system/components/field";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink
} from "@szum-tech/design-system/components/pagination";
import { Select, SelectContent, SelectItem } from "@szum-tech/design-system/components/select";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "~/features/tickets/constants";
import type { Pagination as PaginationMeta, TableQuery } from "~/features/tickets/types/table-query";

type TablePaginationProps = {
  pagination: PaginationMeta;
  query: TableQuery;
  isPending: boolean;
  onQueryChange(patch: Partial<TableQuery>): void;
};

const numberFormatter = new Intl.NumberFormat();

/**
 * Page navigation and rows-per-page for the table. The server owns paging, so navigation goes
 * through the URL: each control is a real button (via `PaginationLink asChild`) that requests a
 * target page rather than following an `href`, which keeps the transition-based dimming intact.
 */
export function TablePagination({ pagination, query, isPending, onQueryChange }: TablePaginationProps) {
  const { page, total, totalPages } = pagination;
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-mute">
        Strona {numberFormatter.format(page)} z {numberFormatter.format(totalPages)} · {numberFormatter.format(total)}{" "}
        zgłoszeń
      </p>

      <div className="flex items-center gap-4">
        <Field className="w-fit" orientation="horizontal">
          <FieldLabel htmlFor="ticket-page-size">Na stronie</FieldLabel>
          <Select
            className="w-20"
            disabled={isPending}
            id="ticket-page-size"
            onValueChange={(value) => onQueryChange({ size: Number(value) })}
            value={String(query.size)}
          >
            <SelectContent align="start">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink aria-label="Pierwsza strona" asChild size="icon-sm">
                <button disabled={isFirst || isPending} onClick={() => onQueryChange({ page: 1 })} type="button">
                  <ChevronsLeftIcon />
                </button>
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink aria-label="Poprzednia strona" asChild size="icon-sm">
                <button disabled={isFirst || isPending} onClick={() => onQueryChange({ page: page - 1 })} type="button">
                  <ChevronLeftIcon />
                </button>
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink aria-label="Następna strona" asChild size="icon-sm">
                <button disabled={isLast || isPending} onClick={() => onQueryChange({ page: page + 1 })} type="button">
                  <ChevronRightIcon />
                </button>
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink aria-label="Ostatnia strona" asChild size="icon-sm">
                <button
                  disabled={isLast || isPending}
                  onClick={() => onQueryChange({ page: totalPages })}
                  type="button"
                >
                  <ChevronsRightIcon />
                </button>
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
