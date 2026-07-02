import "server-only";

import { headers } from "next/headers";
import { createLogger } from "~/lib/logger";
import { categorizeServiceError, type ServiceResult, serviceErrorFromStatus } from "~/lib/services/errors";

/**
 * Server-side HTTP client for the app's own API routes — domain-agnostic.
 *
 * Pages and server actions never touch services or the store directly; they call the API over HTTP
 * through this helper, so the route handlers stay the single data boundary. Failures come back as a
 * `[error, data]` tuple (never thrown), so callers branch on the typed `ServiceError` flags. The base
 * URL is derived from the incoming request headers so it works in dev and behind a proxy alike.
 */

const logger = createLogger({ module: "api-client" });

async function getBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    throw new Error("Cannot resolve request host for an internal API call");
  }
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = headerList.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${protocol}://${host}`;
}

/** Fetches an app API route and returns `[error, data]`. Never cached — server state is mutable. */
export async function apiFetch<T>(path: string, resource: string, init?: RequestInit): Promise<ServiceResult<T>> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}${path}`, { cache: "no-store", ...init });

    if (!response.ok) {
      const error = serviceErrorFromStatus(response.status, resource);
      logger.error({ errorCode: error.code, path, status: response.status }, "Internal API call failed");
      return [error, null];
    }

    const data = (await response.json()) as T;
    return [null, data];
  } catch (caught) {
    const error = categorizeServiceError(caught, resource);
    logger.error({ errorCode: error.code, isRetryable: error.isRetryable, path }, "Internal API call threw");
    return [error, null];
  }
}
