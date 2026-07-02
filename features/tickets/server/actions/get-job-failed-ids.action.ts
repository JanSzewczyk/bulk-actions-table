"use server";

import { getJobFailures } from "~/features/tickets/server/api";
import type { ActionResponse } from "~/lib/action-types";
import { logger } from "./logger";
import { mapServiceError } from "./map-service-error";

const PAGE_SIZE = 200;
/** Safety cap on pages fetched — a job can have at most `DATASET_SIZE` failures, so this is generous. */
const MAX_PAGES = 100;

/**
 * Backs the "Retry failed" action after an async job completes. `GET /api/jobs/:id` only reports
 * counters, so retrying requires walking the paginated failures endpoint to collect the actual ids.
 */
export async function getJobFailedIdsAction(jobId: string): ActionResponse<Array<string>> {
  const ids: Array<string> = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const [error, result] = await getJobFailures(jobId, page, PAGE_SIZE);
    if (error) {
      logger.error({ errorCode: error.code, jobId, page }, "Failed to fetch job failures page");
      return { error: mapServiceError(error), success: false };
    }

    ids.push(...result.data.map((item) => item.id));

    if (page >= result.pagination.totalPages) {
      break;
    }
  }

  return { data: ids, success: true };
}
