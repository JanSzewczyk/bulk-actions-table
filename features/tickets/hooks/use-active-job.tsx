"use client";

import * as React from "react";
import { ACTIVE_JOB_STORAGE_KEY } from "~/features/tickets/constants";
import { useJobPolling } from "~/features/tickets/hooks/use-job-polling";
import type { BulkAction } from "~/features/tickets/types/bulk";
import type { JobProgress } from "~/features/tickets/types/job";
import type { ActionResponse } from "~/lib/action-types";

export type ActiveJob = { jobId: string; action: BulkAction; assigneeId?: string };

type UseActiveJobOptions = {
  onPollAction(jobId: string): ActionResponse<JobProgress>;
  onCompleted(completedJob: ActiveJob, finalProgress: JobProgress): void;
  /** Polling gave up on this job (see `useJobPolling`) — the caller should tell the user and move on. */
  onLost(lostJob: ActiveJob): void;
};

type UseActiveJobResult = {
  activeJob: ActiveJob | null;
  jobProgress: JobProgress | null;
  startJob(job: ActiveJob): void;
};

function readStoredActiveJob(): ActiveJob | null {
  const raw = sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as ActiveJob;
  } catch {
    return null;
  }
}

/**
 * Tracks a background bulk-action job across its whole lifetime: persists it to `sessionStorage` so
 * it resumes polling after a `router.refresh()` or a full page reload, and polls it via
 * `useJobPolling` until completion. Deliberately has no opinion on what happens when a job completes
 * (toasts, retry prompts) — that's UI-specific and stays with the caller via `onCompleted`, the same
 * way `useJobPolling` itself only reports progress and defers to a callback.
 */
export function useActiveJob({ onPollAction, onCompleted, onLost }: UseActiveJobOptions): UseActiveJobResult {
  const [activeJob, setActiveJob] = React.useState<ActiveJob | null>(null);

  // Resume polling a job that was still running when the page was refreshed. Read in a mount effect
  // (never a useState initializer) so this stays SSR-safe — sessionStorage doesn't exist on the server.
  React.useEffect(() => {
    const stored = readStoredActiveJob();
    if (stored) {
      setActiveJob(stored);
    }
  }, []);

  function startJob(job: ActiveJob) {
    sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(job));
    setActiveJob(job);
  }

  const jobProgress = useJobPolling({
    jobId: activeJob?.jobId ?? null,
    onCompleted: (finalProgress) => {
      const completedJob = activeJob;
      sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      setActiveJob(null);
      if (completedJob) {
        onCompleted(completedJob, finalProgress);
      }
    },
    onLost: () => {
      const lostJob = activeJob;
      sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      setActiveJob(null);
      if (lostJob) {
        onLost(lostJob);
      }
    },
    onPollAction
  });

  return { activeJob, jobProgress, startJob };
}
