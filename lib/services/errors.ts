/**
 * Framework-agnostic service error contract used across the app's service and API-client layers.
 *
 * Every fallible operation returns a `ServiceResult<T>` tuple — `[error, null]` on failure,
 * `[null, data]` on success — instead of throwing across layer boundaries. Callers branch on the
 * typed flags (`isNotFound`, `isRetryable`, …) rather than parsing messages.
 */

export const ServiceErrorCode = {
  ALREADY_EXISTS: "already-exists",
  DATA_CORRUPTION: "data-corruption",
  INTERNAL: "internal",
  NETWORK: "network",
  NOT_FOUND: "not-found",
  PERMISSION_DENIED: "permission-denied",
  TIMEOUT: "timeout",
  VALIDATION: "validation"
} as const;

export type ServiceErrorCode = (typeof ServiceErrorCode)[keyof typeof ServiceErrorCode];

type ServiceErrorFlags = {
  isRetryable: boolean;
  isNotFound: boolean;
  isAlreadyExists: boolean;
  isPermissionDenied: boolean;
};

const NO_FLAGS: ServiceErrorFlags = {
  isAlreadyExists: false,
  isNotFound: false,
  isPermissionDenied: false,
  isRetryable: false
};

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly isRetryable: boolean;
  readonly isNotFound: boolean;
  readonly isAlreadyExists: boolean;
  readonly isPermissionDenied: boolean;

  private constructor(code: ServiceErrorCode, message: string, flags: Partial<ServiceErrorFlags> = {}) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.isRetryable = flags.isRetryable ?? NO_FLAGS.isRetryable;
    this.isNotFound = flags.isNotFound ?? NO_FLAGS.isNotFound;
    this.isAlreadyExists = flags.isAlreadyExists ?? NO_FLAGS.isAlreadyExists;
    this.isPermissionDenied = flags.isPermissionDenied ?? NO_FLAGS.isPermissionDenied;
  }

  static validation(message: string): ServiceError {
    return new ServiceError(ServiceErrorCode.VALIDATION, message);
  }

  static notFound(resource: string): ServiceError {
    return new ServiceError(ServiceErrorCode.NOT_FOUND, `${resource} not found`, { isNotFound: true });
  }

  static alreadyExists(resource: string): ServiceError {
    return new ServiceError(ServiceErrorCode.ALREADY_EXISTS, `${resource} already exists`, { isAlreadyExists: true });
  }

  static permissionDenied(resource = "resource"): ServiceError {
    return new ServiceError(ServiceErrorCode.PERMISSION_DENIED, `Not allowed to access ${resource}`, {
      isPermissionDenied: true
    });
  }

  static dataCorruption(resource: string): ServiceError {
    return new ServiceError(ServiceErrorCode.DATA_CORRUPTION, `${resource} data is invalid`);
  }

  static network(message = "Network request failed"): ServiceError {
    return new ServiceError(ServiceErrorCode.NETWORK, message, { isRetryable: true });
  }

  static timeout(resource = "request"): ServiceError {
    return new ServiceError(ServiceErrorCode.TIMEOUT, `Timed out while processing ${resource}`, { isRetryable: true });
  }

  static internal(resource = "operation", detail?: string): ServiceError {
    const message = detail ? `${resource} failed: ${detail}` : `${resource} failed`;
    return new ServiceError(ServiceErrorCode.INTERNAL, message);
  }

  /** Transient server-side failure (5xx / rate limit) — safe to retry. */
  static unavailable(resource = "service", detail?: string): ServiceError {
    const message = detail ? `${resource} is unavailable: ${detail}` : `${resource} is temporarily unavailable`;
    return new ServiceError(ServiceErrorCode.INTERNAL, message, { isRetryable: true });
  }
}

export type ServiceResult<T> = [ServiceError, null] | [null, T];

/** Maps an unknown thrown value onto a `ServiceError`. Network/abort errors are marked retryable. */
export function categorizeServiceError(error: unknown, resource: string): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return ServiceError.timeout(resource);
  }
  if (error instanceof TypeError) {
    // fetch throws a TypeError on network-level failures (DNS, connection refused, offline).
    return ServiceError.network(error.message);
  }
  if (error instanceof Error) {
    return ServiceError.internal(resource, error.message);
  }
  return ServiceError.internal(resource);
}

/** Maps a non-OK HTTP response status onto a `ServiceError` (used by the internal API client). */
export function serviceErrorFromStatus(status: number, resource: string): ServiceError {
  if (status === 404) {
    return ServiceError.notFound(resource);
  }
  if (status === 400 || status === 422) {
    return ServiceError.validation(`Invalid request for ${resource}`);
  }
  if (status === 401 || status === 403) {
    return ServiceError.permissionDenied(resource);
  }
  if (status === 408 || status === 429 || status >= 500) {
    return ServiceError.unavailable(resource, `HTTP ${status}`);
  }
  return ServiceError.internal(resource, `HTTP ${status}`);
}
