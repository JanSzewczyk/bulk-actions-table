import { type ServiceError, ServiceErrorCode } from "~/lib/services/errors";

/** Translates a `ServiceError` into a user-facing message. Never exposes the internal code. */
export function mapServiceError(error: ServiceError): string {
  if (error.isNotFound) {
    return "The requested resource was not found.";
  }
  if (error.isPermissionDenied) {
    return "You don't have permission to perform this action.";
  }
  if (error.isRetryable) {
    return "The service is temporarily unavailable. Please try again.";
  }
  if (error.code === ServiceErrorCode.VALIDATION) {
    return "Invalid request data.";
  }
  return "An unexpected error occurred.";
}
