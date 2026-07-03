"use client";

import * as React from "react";
import { JOB_POLL_INTERVAL_MS } from "~/features/tickets/constants";
import type { JobProgress } from "~/features/tickets/types/job";
import { JobStatus } from "~/features/tickets/types/job";
import type { ActionResponse } from "~/lib/action-types";

type UseJobPollingOptions = {
  jobId: string | null;
  onPollAction(jobId: string): ActionResponse<JobProgress>;
  onCompleted(finalProgress: JobProgress): void;
};

/**
 * Polls `onPollAction` on a fixed interval while `jobId` is set, stopping once the job leaves
 * `running`. Uses a recursive `setTimeout` (not `setInterval`) so a slow response can't stack polls,
 * and keeps the callbacks in refs so the effect only restarts when `jobId` itself changes.
 */
export function useJobPolling({ jobId, onPollAction, onCompleted }: UseJobPollingOptions): JobProgress | null {
  const [progress, setProgress] = React.useState<JobProgress | null>(null);
  const onPollActionRef = React.useRef(onPollAction);
  const onCompletedRef = React.useRef(onCompleted);
  onPollActionRef.current = onPollAction;
  onCompletedRef.current = onCompleted;

  React.useEffect(() => {
    if (!jobId) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll(id: string) {
      const result = await onPollActionRef.current(id);
      if (cancelled) {
        return;
      }
      if (!result.success) {
        return;
      }

      setProgress(result.data);

      if (result.data.status === JobStatus.RUNNING) {
        timeoutId = setTimeout(() => poll(id), JOB_POLL_INTERVAL_MS);
      } else {
        onCompletedRef.current(result.data);
      }
    }

    void poll(jobId);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [jobId]);

  return progress;
}
