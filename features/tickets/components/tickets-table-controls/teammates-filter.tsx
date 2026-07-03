"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@szum-tech/design-system/components/avatar";
import { Button } from "@szum-tech/design-system/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue
} from "@szum-tech/design-system/components/combobox";
import { Field } from "@szum-tech/design-system/components/field";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@szum-tech/design-system/components/item";
import { cn } from "@szum-tech/design-system/utils";
import { UsersIcon } from "lucide-react";
import { UNASSIGNED_TEAMMATE_ID } from "~/features/tickets/constants";
import type { Teammate } from "~/features/tickets/types/teammate";
import { initials } from "~/features/tickets/utils/ticket-presentation";

type TeammatesFilterProps = {
  teammates: Array<Teammate>;
  /** Selected teammate ids, plus `UNASSIGNED_TEAMMATE_ID` when "Unassigned" is included. */
  value: Array<string>;
  disabled?: boolean;
  onValueChange(ids: Array<string>): void;
};

/** First name (first whitespace-separated token) — `name` has no separate first/last name field. */
function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

function CompactAvatar({ teammate, className }: { teammate: Teammate | null; className?: string }) {
  if (teammate === null) {
    return (
      <span className={cn("flex items-center justify-center rounded-full bg-muted text-muted-foreground", className)}>
        <UsersIcon className="size-3" />
      </span>
    );
  }
  return (
    <Avatar className={className}>
      {teammate.avatarUrl ? <AvatarImage alt="" src={teammate.avatarUrl} /> : null}
      <AvatarFallback className="text-[9px]">{initials(teammate.name)}</AvatarFallback>
    </Avatar>
  );
}

type TriggerSummaryProps = {
  selectedIds: Array<string>;
  teammateById: Map<string, Teammate>;
};

function TriggerSummary({ selectedIds, teammateById }: TriggerSummaryProps) {
  if (selectedIds.length === 0) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <UsersIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">Assignee</span>
      </span>
    );
  }

  const visibleIds = selectedIds.slice(0, 4);
  const hiddenCount = selectedIds.length - visibleIds.length;
  const countLabel =
    selectedIds.length === 1
      ? "1 assignee"
      : hiddenCount > 0
        ? `+${hiddenCount} more`
        : `${selectedIds.length} assignees`;

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex -space-x-1">
        {visibleIds.map((id) => (
          <CompactAvatar
            className="size-5 border-2 border-background"
            key={id}
            teammate={id === UNASSIGNED_TEAMMATE_ID ? null : (teammateById.get(id) ?? null)}
          />
        ))}
      </span>
      <span className="truncate">{countLabel}</span>
    </span>
  );
}

/**
 * A single row in the dropdown list — avatar + name only (no email), unlike the "Assign to…" picker's
 * full `TeammateItem` row, because this dropdown is much narrower and needs to stay one line.
 */
function FilterRow({ id, teammateById }: { id: string; teammateById: Map<string, Teammate> }) {
  const teammate = id === UNASSIGNED_TEAMMATE_ID ? null : (teammateById.get(id) ?? null);
  const label = teammate === null ? "Unassigned" : teammate.name;

  return (
    <Item className="p-0" size="sm">
      <ItemMedia className="size-4" variant="image">
        <CompactAvatar className="size-4" teammate={teammate} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="overflow-clip whitespace-nowrap">{label}</ItemTitle>
      </ItemContent>
    </Item>
  );
}

/**
 * Multi-select "Assignee" filter for the tickets table. Sorted by first name (same order as the
 * "Assign to…" picker); search matches name and email. "Unassigned" always sits above the scrollable,
 * searchable list, exactly like the assign picker's static entry — but here it's just another
 * selectable value, not an exclusive "clear" action, since narrowing to "assigned to A or nobody" is a
 * perfectly ordinary filter combination.
 */
export function TeammatesFilter({ teammates, value, disabled, onValueChange }: TeammatesFilterProps) {
  const sorted = teammates.toSorted(
    (a, b) => firstName(a.name).localeCompare(firstName(b.name)) || a.name.localeCompare(b.name)
  );
  const teammateById = new Map(sorted.map((teammate) => [teammate.id, teammate]));
  const items = [UNASSIGNED_TEAMMATE_ID, ...sorted.map((teammate) => teammate.id)];

  function itemToStringValue(id: string): string {
    if (id === UNASSIGNED_TEAMMATE_ID) {
      return "Unassigned no assignee";
    }
    const teammate = teammateById.get(id);
    return teammate ? `${teammate.name} ${teammate.email}` : id;
  }

  return (
    <Field className="w-56">
      <Combobox
        autoHighlight
        disabled={disabled}
        items={items}
        itemToStringValue={itemToStringValue}
        multiple
        onValueChange={onValueChange}
        value={value}
      >
        <ComboboxTrigger
          render={<Button className="w-full justify-between font-normal" type="button" variant="outline" />}
        >
          <ComboboxValue placeholder="Assignee">
            {(selectedIds: Array<string>) => <TriggerSummary selectedIds={selectedIds} teammateById={teammateById} />}
          </ComboboxValue>
        </ComboboxTrigger>

        <ComboboxContent className="min-w-(--anchor-width) max-w-(--anchor-width)">
          <ComboboxInput className="mb-1" placeholder="Search people…" showTrigger={false} />
          <ComboboxEmpty>No teammates found.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxItem value={UNASSIGNED_TEAMMATE_ID}>
              <FilterRow id={UNASSIGNED_TEAMMATE_ID} teammateById={teammateById} />
            </ComboboxItem>
            <ComboboxSeparator />
            {sorted.map((teammate) => (
              <ComboboxItem key={teammate.id} value={teammate.id}>
                <FilterRow id={teammate.id} teammateById={teammateById} />
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
