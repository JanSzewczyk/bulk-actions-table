import { z } from "zod";
import { BulkAction, type BulkRequest } from "~/features/tickets/types/bulk";
import { TicketStatus } from "~/features/tickets/types/ticket";

/**
 * Validates the `POST /api/tickets/bulk` body. Unlike the GET query schema (which falls back on bad
 * input), this throws via `.parse()` — an invalid bulk payload is a genuine contract violation (400),
 * not something the caller should silently recover from.
 */

const simulationParamsSchema = z.object({
  concurrency: z.coerce.number().int().positive().max(20),
  failureRate: z.coerce.number().min(0).max(1),
  seed: z.coerce.number().int()
});

export const tableFilterSchema = z.object({
  q: z.string().trim().min(1).nullable(),
  status: z.enum(TicketStatus).nullable()
});

const commonBulkFields = {
  action: z.enum(BulkAction),
  assigneeId: z.string().min(1).optional()
};

const includeBulkSchema = simulationParamsSchema.extend({
  ...commonBulkFields,
  ids: z.array(z.string().min(1)).min(1),
  mode: z.literal("include")
});

const allBulkSchema = simulationParamsSchema.extend({
  ...commonBulkFields,
  excluded: z.array(z.string().min(1)),
  filter: tableFilterSchema,
  mode: z.literal("all")
});

export const bulkRequestSchema = z
  .discriminatedUnion("mode", [includeBulkSchema, allBulkSchema])
  .refine((value) => value.action !== BulkAction.ASSIGN || typeof value.assigneeId === "string", {
    message: "assigneeId is required for the assign action",
    path: ["assigneeId"]
  });

/** Throws a `ZodError` on an invalid payload — the route handler maps that to a 400. */
export function parseBulkRequest(input: unknown): BulkRequest {
  return bulkRequestSchema.parse(input) as BulkRequest;
}

const outsideFilterCountRequestSchema = z.object({
  filter: tableFilterSchema,
  ids: z.array(z.string().min(1))
});

export type OutsideFilterCountRequest = z.infer<typeof outsideFilterCountRequestSchema>;

export function parseOutsideFilterCountRequest(input: unknown): OutsideFilterCountRequest {
  return outsideFilterCountRequestSchema.parse(input);
}
