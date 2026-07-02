type ActionStateSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

type ActionStateFailed = {
  success: false;
  error: string;
  fieldErrors?: Record<string, Array<string>>;
};

export type ActionResponse<T = unknown> = Promise<ActionStateSuccess<T> | ActionStateFailed>;

export type RedirectAction = Promise<never | ActionStateFailed>;

export function isActionSuccess<T>(result: Awaited<ActionResponse<T>>): result is ActionStateSuccess<T> {
  return result.success;
}

export function isActionFailed(result: Awaited<ActionResponse<unknown>>): result is ActionStateFailed {
  return !result.success;
}
