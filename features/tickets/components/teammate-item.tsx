import { Avatar, AvatarFallback, AvatarImage } from "@szum-tech/design-system/components/avatar";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@szum-tech/design-system/components/item";
import type * as React from "react";
import { initials } from "~/features/tickets/lib/ticket-presentation";
import type { Teammate } from "~/features/tickets/types/teammate";

type TeammateItemProps = {
  teammate: Teammate;
  children?: React.ReactNode;
};

/** Avatar + name/email identity row — shared by the assignee table column and the assign picker. */
export function TeammateItem({ teammate, children }: TeammateItemProps) {
  return (
    <Item className="w-full p-0" size="sm">
      <ItemMedia variant="image">
        <Avatar className="size-10">
          <AvatarImage alt="" src={teammate.avatarUrl ?? undefined} />
          <AvatarFallback>{initials(teammate.name)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{teammate.name}</ItemTitle>
        <ItemDescription>{teammate.email}</ItemDescription>
      </ItemContent>
      {children}
    </Item>
  );
}
