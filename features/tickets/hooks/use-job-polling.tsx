"use client";

import * as React from "react";
import { JOB_POLL_INTERVAL_MS } from "~/features/tickets/constants";
import type { JobProgress } from "~/features/tickets/types/job";
import { JobStatus } from "~/features/tickets/types/job";
import type { ActionResponse } from "~/lib/action-types";

/** Consecutive failed polls tolerated (transient network blips) before giving up on the job. */
const MAX_CONSECUTIVE_POLL_FAILURES = 3;

type UseJobPollingOptions = {
  jobId: string | null;
  onPollAction(jobId: string): ActionResponse<JobProgress>;
  onCompleted(finalProgress: JobProgress): void;
  /** The job's status could not be determined after repeated failed polls — treat as unrecoverable. */
  onLost(): void;
};

/**
 * Polls `onPollAction` on a fixed interval while `jobId` is set, stopping once the job leaves
 * `running`. Uses a recursive `setTimeout` (not `setInterval`) so a slow response can't stack polls,
 * and keeps the callbacks in refs so the effect only restarts when `jobId` itself changes.
 *
 * A poll failure retries (a transient network blip shouldn't kill tracking), but after
 * `MAX_CONSECUTIVE_POLL_FAILURES` in a row it calls `onLost` instead of retrying forever — otherwise a
 * stale job id (server restarted, or the job was genuinely never found) leaves the caller's "job
 * running" state stuck permanently, with no way for the user to unblock the toolbar.
 */
export function useJobPolling({ jobId, onPollAction, onCompleted, onLost }: UseJobPollingOptions): JobProgress | null {
  const [progress, setProgress] = React.useState<JobProgress | null>(null);
  const onPollActionRef = React.useRef(onPollAction);
  const onCompletedRef = React.useRef(onCompleted);
  const onLostRef = React.useRef(onLost);
  onPollActionRef.current = onPollAction;
  onCompletedRef.current = onCompleted;
  onLostRef.current = onLost;

  React.useEffect(() => {
    if (!jobId) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    let consecutiveFailures = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll(id: string) {
      const result = await onPollActionRef.current(id);
      if (cancelled) {
        return;
      }
      if (!result.success) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          onLostRef.current();
          return;
        }
        timeoutId = setTimeout(() => poll(id), JOB_POLL_INTERVAL_MS);
        return;
      }

      consecutiveFailures = 0;
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
