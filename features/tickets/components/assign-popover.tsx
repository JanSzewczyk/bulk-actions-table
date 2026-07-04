"use client";

import { Badge } from "@szum-tech/design-system/components/badge";
import { Button } from "@szum-tech/design-system/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@szum-tech/design-system/components/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@szum-tech/design-system/components/input-group";
import { ItemActions } from "@szum-tech/design-system/components/item";
import { SearchIcon, UserPlusIcon } from "lucide-react";
import * as React from "react";
import { CURRENT_USER_ID } from "~/features/tickets/constants";
import type { Teammate } from "~/features/tickets/types/teammate";
import { TeammateItem } from "./teammate-item";

type AssignPopoverProps = {
  teammates: Array<Teammate>;
  disabled: boolean;
  onAssign(teammateId: string): void;
  onUnassign(): void;
};

/** First name (first whitespace-separated token) — `name` has no separate first/last name field. */
function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

/**
 * "Assign to…" picker for the bulk toolbar. Teammate list comes from server data, sorted by first
 * name; search filters client-side. "Unassigned" is a static entry (not a real teammate) that clears
 * the assignment instead of setting one — it always stays above the scrollable, searchable list.
 */
export function AssignPopover({ teammates, disabled, onAssign, onUnassign }: AssignPopoverProps) {
  const [search, setSearch] = React.useState("");
  const sorted = teammates.toSorted(
    (a, b) => firstName(a.name).localeCompare(firstName(b.name)) || a.name.localeCompare(b.name)
  );
  const filtered = sorted.filter((teammate) => teammate.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} size="sm" startIcon={<UserPlusIcon />} variant="outline">
          Assign to…
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <div className="p-2">
          <InputGroup>
            <InputGroupInput
              aria-label="Search people"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Search…"
              value={search}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-auto" onClick={onUnassign}>
          <TeammateItem teammate={null} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-1.5 text-muted-foreground text-small">No results.</p>
          ) : (
            filtered.map((teammate) => (
              <DropdownMenuItem
                className="h-auto"
                disabled={!teammate.isAvailable}
                key={teammate.id}
                onClick={() => onAssign(teammate.id)}
              >
                <TeammateItem teammate={teammate}>
                  <ItemActions>
                    {teammate.id === CURRENT_USER_ID ? <Badge variant="secondary">You</Badge> : null}
                    {teammate.isAvailable ? null : (
                      <span className="text-muted-foreground text-small">unavailable</span>
                    )}
                  </ItemActions>
                </TeammateItem>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
