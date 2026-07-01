"use client";

import { Button } from "@szum-tech/design-system/components/button";
import { Header } from "@szum-tech/design-system/components/header";
import { GithubIcon } from "~/components/ui/icons/github";
import { ThemeToggle } from "~/components/ui/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-body-sm">Szum-Tech</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
          </div>
        </div>
      </Header>

      <main className="flex-1" id="main-content"></main>
    </div>
  );
}
