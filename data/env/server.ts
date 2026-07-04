import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: process.env,
  server: {
    ANALYZE: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    /** Element count above which a bulk action escalates from sync to an async job. */
    BULK_ASYNC_THRESHOLD: z.coerce.number().int().positive().optional().default(400),
    CI: z
      .enum(["true", "false", "0", "1"])
      .optional()
      .transform((value) => value === "true" || value === "1"),
    /** Deterministic seed for the mock dataset — the same seed reproduces the same tickets after a restart. */
    DATASET_SEED: z.coerce.number().int().optional().default(12345),
    /** Number of mock tickets generated on first access (kept large so the async path is visible). */
    DATASET_SIZE: z.coerce.number().int().positive().optional().default(8000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional().default("info"),
    NODE_ENV: z.enum(["development", "test", "production"]),
    VERCEL_URL: z.string().optional()
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION
});
