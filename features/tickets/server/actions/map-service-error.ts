import { type ServiceError, ServiceErrorCode } from "~/lib/services/errors";

/** Translates a `ServiceError` into a user-facing Polish message. Never exposes the internal code. */
export function mapServiceError(error: ServiceError): string {
  if (error.isNotFound) {
    return "Nie znaleziono wybranego zasobu.";
  }
  if (error.isPermissionDenied) {
    return "Brak uprawnień do wykonania tej operacji.";
  }
  if (error.isRetryable) {
    return "Usługa jest chwilowo niedostępna. Spróbuj ponownie.";
  }
  if (error.code === ServiceErrorCode.VALIDATION) {
    return "Nieprawidłowe dane żądania.";
  }
  return "Wystąpił nieoczekiwany błąd.";
}
