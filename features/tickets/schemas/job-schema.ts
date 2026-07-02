import { z } from "zod";

/** Parses `GET /api/jobs/:id/failures` pagination params — falls back like the table query schema. */
const jobFailuresQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  size: z.coerce.number().int().positive().max(200).catch(50)
});

export type JobFailuresQuery = z.infer<typeof jobFailuresQuerySchema>;

export function parseJobFailuresQuery(input: URLSearchParams): JobFailuresQuery {
  return jobFailuresQuerySchema.parse(Object.fromEntries(input.entries()));
}
