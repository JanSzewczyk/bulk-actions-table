import { Button } from "@szum-tech/design-system/components/button";
import { Header } from "@szum-tech/design-system/components/header";
import type { Metadata } from "next";
import { GithubIcon } from "~/components/ui/icons/github";
import { ThemeToggle } from "~/components/ui/theme-toggle";
import { TicketsTableSection } from "~/features/tickets/components";
import { SelectionProvider } from "~/features/tickets/hooks/use-selection";
import { parseTableQuery } from "~/features/tickets/schemas";
import { getSimulationParams, getTeammates, getTicketsPage } from "~/features/tickets/server";
import { bulkActionAction } from "~/features/tickets/server/actions/bulk-action.action";
import { getJobFailedIdsAction } from "~/features/tickets/server/actions/get-job-failed-ids.action";
import { outsideFilterCountAction } from "~/features/tickets/server/actions/outside-filter-count.action";
import { pollJobAction } from "~/features/tickets/server/actions/poll-job.action";
import { updateSimulationParamsAction } from "~/features/tickets/server/actions/update-simulation-params.action";
import { createLogger } from "~/lib/logger";

export const metadata: Metadata = {
  title: "Tickets"
};

const logger = createLogger({ module: "tickets-page" });

async function loadData(searchParams: PageProps<"/">["searchParams"]) {
  const params = await searchParams;
  const query = parseTableQuery(params);

  const [error, page] = await getTicketsPage(query);
  if (error) {
    logger.error({ errorCode: error.code, isRetryable: error.isRetryable }, "Failed to load tickets page");
    // Let the error boundary render the fallback with a retry.
    throw new Error("Failed to load tickets");
  }

  const [teammatesError, teammates] = await getTeammates();
  if (teammatesError) {
    logger.error(
      { errorCode: teammatesError.code, isRetryable: teammatesError.isRetryable },
      "Failed to load teammates"
    );
    throw new Error("Failed to load teammates");
  }

  const [simulationError, simulation] = await getSimulationParams();
  if (simulationError) {
    logger.error(
      { errorCode: simulationError.code, isRetryable: simulationError.isRetryable },
      "Failed to load simulation params"
    );
    throw new Error("Failed to load simulation settings");
  }

  logger.info({ page: query.page, size: query.size, total: page.pagination.total }, "Loaded tickets page");
  return { page, query, simulation, teammates };
}

export default async function TicketsPage({ searchParams }: PageProps<"/">) {
  const { query, page, teammates, simulation } = await loadData(searchParams);

  return (
    <div className="flex min-h-screen flex-col">
      <Header>
        <div className="flex w-full items-center justify-between">
          <span className="font-semibold text-body-sm">Bulk Actions Table</span>
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8" id="main-content">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-heading-h1">Tickets</h1>
          <p className="text-mute">Manage support tickets and run bulk actions on many at once.</p>
        </div>

        <SelectionProvider>
          <TicketsTableSection
            onBulkAction={bulkActionAction}
            onGetJobFailedIdsAction={getJobFailedIdsAction}
            onOutsideFilterCountAction={outsideFilterCountAction}
            onPollJobAction={pollJobAction}
            onUpdateSimulationAction={updateSimulationParamsAction}
            pagination={page.pagination}
            query={query}
            simulation={simulation}
            teammates={teammates}
            tickets={page.data}
          />
        </SelectionProvider>
      </main>
    </div>
  );
}
