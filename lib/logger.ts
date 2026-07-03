import pino from "pino";
import { env } from "~/data/env/server";

/**
 * Logger configuration for the application
 * Uses Pino for structured logging with different transports based on environment
 */
const logger = pino({
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  },
  // `env.LOG_LEVEL` is the validated source, but `SKIP_ENV_VALIDATION` (set for tests and Docker
  // builds) makes T3 Env skip its Zod defaults and pass raw `process.env` through untouched — so this
  // falls back to the schema's own default instead of handing Pino an `undefined` level.
  level: env.LOG_LEVEL || "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    env.NODE_ENV === "development"
      ? {
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard"
          },
          target: "pino-pretty"
        }
      : undefined
});

/**
 * Creates a child logger with additional context
 * @param context - Additional context to include in all log messages
 * @returns Child logger instance
 *
 * @example
 * const apiLogger = createLogger({ module: 'api', endpoint: '/users' });
 * apiLogger.info('Fetching users');
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export default logger;
