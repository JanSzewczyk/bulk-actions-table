"use client";

import { Badge } from "@szum-tech/design-system/components/badge";
import { Button } from "@szum-tech/design-system/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@szum-tech/design-system/components/dropdown-menu";
import { Input } from "@szum-tech/design-system/components/input";
import { ItemActions } from "@szum-tech/design-system/components/item";
import { UserPlusIcon } from "lucide-react";
import * as React from "react";
import { CURRENT_USER_ID } from "~/features/tickets/constants";
import type { Teammate } from "~/features/tickets/types/teammate";
import { TeammateItem } from "./teammate-item";

type AssignPopoverProps = {
  teammates: Array<Teammate>;
  disabled: boolean;
  onAssign(teammateId: string): void;
};

/** "Assign to…" picker for the bulk toolbar. Teammate list comes from server data; search filters client-side. */
export function AssignPopover({ teammates, disabled, onAssign }: AssignPopoverProps) {
  const [search, setSearch] = React.useState("");
  const filtered = teammates.filter((teammate) => teammate.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} size="sm" startIcon={<UserPlusIcon />} variant="outline">
          Assign to…
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>Choose a person</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <Input
            aria-label="Search people"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search…"
            value={search}
          />
        </div>
        <DropdownMenuSeparator />
        {filtered.length === 0 ? (
          <p className="px-2 py-1.5 text-muted-foreground text-small">No results.</p>
        ) : (
          filtered.map((teammate) => (
            <DropdownMenuItem className="h-auto" key={teammate.id} onClick={() => onAssign(teammate.id)}>
              <TeammateItem teammate={teammate}>
                <ItemActions>
                  {teammate.id === CURRENT_USER_ID ? <Badge variant="secondary">You</Badge> : null}
                  {teammate.isAvailable ? null : <span className="text-muted-foreground text-small">unavailable</span>}
                </ItemActions>
              </TeammateItem>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
