import type { BadgeVariant } from "@szum-tech/design-system/components/badge";
import { TicketStatus as Status, type TicketStatus } from "~/features/tickets/types/ticket";

/**
 * Presentation mappings for tickets — Polish status labels, status → badge colour, and date
 * formatting. Client-safe: consumed by the table and, later, the toolbar and dialogs.
 */

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [Status.OPEN]: "Otwarte",
  [Status.PENDING]: "Oczekujące",
  [Status.RESOLVED]: "Rozwiązane",
  [Status.CLOSED]: "Zamknięte",
  [Status.ARCHIVED]: "Zarchiwizowane"
};

export const STATUS_BADGE_VARIANT: Record<TicketStatus, BadgeVariant> = {
  [Status.OPEN]: "primary",
  [Status.PENDING]: "warning",
  [Status.RESOLVED]: "success",
  [Status.CLOSED]: "secondary",
  [Status.ARCHIVED]: "outline"
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

export function formatTicketDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const numberFormatter = new Intl.NumberFormat("pl-PL");

/** Group-separated count for banners and toolbars, e.g. 8214 → "8 214". */
export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

/** Initials for the assignee avatar fallback, e.g. "Anna Kowalska" → "AK". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
