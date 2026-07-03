import { Avatar, AvatarFallback, AvatarImage } from "@szum-tech/design-system/components/avatar";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@szum-tech/design-system/components/item";
import { UserIcon } from "lucide-react";
import type * as React from "react";
import type { Teammate } from "~/features/tickets/types/teammate";
import { initials } from "~/features/tickets/utils/ticket-presentation";

type TeammateItemProps = {
  /** `null` renders the "Unassigned" state — same avatar/title/description layout, no real teammate. */
  teammate: Teammate | null;
  children?: React.ReactNode;
};

/**
 * Avatar + name/email identity row — shared by the assignee table column and the assign picker, for
 * both an assigned teammate and the "Unassigned" state, so the two never visually diverge.
 */
export function TeammateItem({ teammate, children }: TeammateItemProps) {
  return (
    <Item className="w-full p-0" size="sm">
      <ItemMedia variant="image">
        {teammate === null ? (
          <span className="flex size-10 items-center justify-center rounded bg-muted text-muted-foreground">
            <UserIcon className="size-5" />
          </span>
        ) : (
          <Avatar className="size-10">
            <AvatarImage alt="" src={teammate.avatarUrl ?? undefined} />
            <AvatarFallback>{initials(teammate.name)}</AvatarFallback>
          </Avatar>
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{teammate === null ? "Unassigned" : teammate.name}</ItemTitle>
        <ItemDescription>{teammate === null ? "No assignee" : teammate.email}</ItemDescription>
      </ItemContent>
      {children}
    </Item>
  );
}
