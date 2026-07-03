"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { GithubIcon } from "~/components/ui/icons/github";

/**
 * The anchor lives inside the same Client Component as the `asChild` Button. Building it here (instead
 * of passing an `<a>` from the Server Component page through the `asChild`/Radix Slot boundary) avoids a
 * server/client hydration mismatch: an element created by a Server Component and merged into a Client
 * Component's Slot loses the prop-merge that Slot applies once it re-renders on the client.
 */
export function GithubLinkButton() {
  return (
    <Button asChild endIcon={<GithubIcon />} size="sm" variant="outline">
      <a
        aria-label="View GitHub repository (opens in new tab)"
        href="https://github.com/JanSzewczyk/bulk-actions-table"
        rel="noreferrer"
        target="_blank"
      >
        GitHub
      </a>
    </Button>
  );
}
