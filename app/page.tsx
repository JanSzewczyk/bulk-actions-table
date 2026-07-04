import { Header } from "@szum-tech/design-system/components/header";
import type { Metadata } from "next";
import * as React from "react";
import { ThemeToggle } from "~/components/ui/theme-toggle";
import { DevPanel, DevPanelFallback, TicketsTableSection } from "~/features/tickets/components";
import { SelectionProvider } from "~/features/tickets/context/selection.context";
import { parseTableQuery } from "~/features/tickets/schemas";
import { getTeammates, getTicketsPage } from "~/features/tickets/server";
import { bulkActionAction } from "~/features/tickets/server/actions/bulk-action.action";
import { getJobFailedIdsAction } from "~/features/tickets/server/actions/get-job-failed-ids.action";
import { outsideFilterCountAction } from "~/features/tickets/server/actions/outside-filter-count.action";
import { pollJobAction } from "~/features/tickets/server/actions/poll-job.action";
import { refreshMatchingCountAction } from "~/features/tickets/server/actions/refresh-matching-count.action";
import { createLogger } from "~/lib/logger";

export const metadata: Metadata = {
  title: "Tickets"
};

const logger = createLogger({ module: "tickets-page" });

async function loadData(searchParams: PageProps<"/">["searchParams"]) {
  const params = await searchParams;
  const query = parseTableQuery(params);

  const [[error, page], [teammatesError, teammates]] = await Promise.all([getTicketsPage(query), getTeammates()]);

  if (error) {
    logger.error({ errorCode: error.code, isRetryable: error.isRetryable }, "Failed to load tickets page");
    // Let the error boundary render the fallback with a retry.
    throw new Error("Failed to load tickets");
  }

  if (teammatesError) {
    logger.error(
      { errorCode: teammatesError.code, isRetryable: teammatesError.isRetryable },
      "Failed to load teammates"
    );
    throw new Error("Failed to load teammates");
  }

  logger.info({ page: query.page, size: query.size, total: page.pagination.total }, "Loaded tickets page");
  return { page, query, teammates };
}

export default async function TicketsPage({ searchParams }: PageProps<"/">) {
  const { query, page, teammates } = await loadData(searchParams);

  return (
    <div className="flex min-h-screen flex-col">
      <Header>
        <div className="flex w-full items-center justify-between">
          <span className="font-semibold text-body-sm">Bulk Actions Table</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </Header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8" id="main-content">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-heading-h1">Tickets</h1>
            <p className="text-mute">Manage support tickets and run bulk actions on many at once.</p>
          </div>

          <React.Suspense fallback={<DevPanelFallback />}>
            <DevPanel />
          </React.Suspense>
        </div>

        <SelectionProvider>
          <TicketsTableSection
            onBulkAction={bulkActionAction}
            onGetJobFailedIdsAction={getJobFailedIdsAction}
            onOutsideFilterCountAction={outsideFilterCountAction}
            onPollJobAction={pollJobAction}
            onRefreshMatchingCountAction={refreshMatchingCountAction}
            pagination={page.pagination}
            query={query}
            teammates={teammates}
            tickets={page.data}
          />
        </SelectionProvider>
      </main>
    </div>
  );
}
