"use client";

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
import { UserPlusIcon } from "lucide-react";
import * as React from "react";
import type { Teammate } from "~/features/tickets/types/teammate";

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
          Przypisz do…
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Wybierz osobę</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <Input
            aria-label="Szukaj osoby"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Szukaj…"
            value={search}
          />
        </div>
        <DropdownMenuSeparator />
        {filtered.length === 0 ? (
          <p className="px-2 py-1.5 text-muted-foreground text-small">Brak wyników.</p>
        ) : (
          filtered.map((teammate) => (
            <DropdownMenuItem key={teammate.id} onClick={() => onAssign(teammate.id)}>
              {teammate.name}
              {teammate.isAvailable ? null : (
                <span className="ml-auto text-muted-foreground text-small">niedostępny</span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
