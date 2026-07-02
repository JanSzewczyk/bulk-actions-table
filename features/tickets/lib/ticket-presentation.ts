import type { BadgeVariant } from "@szum-tech/design-system/components/badge";
import { TicketStatus as Status, type TicketStatus } from "~/features/tickets/types/ticket";

/**
 * Presentation mappings for tickets — status labels, status → badge colour, and date formatting.
 * Client-safe: consumed by the table and, later, the toolbar and dialogs.
 */

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [Status.OPEN]: "Open",
  [Status.PENDING]: "Pending",
  [Status.RESOLVED]: "Resolved",
  [Status.CLOSED]: "Closed",
  [Status.ARCHIVED]: "Archived"
};

export const STATUS_BADGE_VARIANT: Record<TicketStatus, BadgeVariant> = {
  [Status.OPEN]: "primary",
  [Status.PENDING]: "warning",
  [Status.RESOLVED]: "success",
  [Status.CLOSED]: "secondary",
  [Status.ARCHIVED]: "outline"
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

export function formatTicketDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const numberFormatter = new Intl.NumberFormat("en-US");

/** Group-separated count for banners and toolbars, e.g. 8214 → "8,214". */
export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

/** Initials for the assignee avatar fallback, e.g. "Anna Smith" → "AS". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
