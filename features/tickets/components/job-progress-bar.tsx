import { Progress } from "@szum-tech/design-system/components/progress";
import type { JobProgress } from "~/features/tickets/types/job";
import { formatCount } from "~/features/tickets/utils/ticket-presentation";

type JobProgressBarProps = {
  progress: JobProgress;
};

/** Shown while a bulk action runs as an async job — replaces the toolbar until it finishes. */
export function JobProgressBar({ progress }: JobProgressBarProps) {
  const percent = progress.total === 0 ? 100 : Math.round((progress.processed / progress.total) * 100);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between text-body-sm">
        <span className="font-semibold">Running in background…</span>
        <span className="text-muted-foreground">
          {formatCount(progress.processed)} / {formatCount(progress.total)}
          {progress.failedCount > 0 ? ` · ${formatCount(progress.failedCount)} failed` : ""}
        </span>
      </div>
      <Progress value={percent} />
    </div>
  );
}
