/**
 * A teammate a ticket can be assigned to. Source of truth for the "Assign to…" picker — the list is
 * part of the API contract (`GET /api/users`) and is never hardcoded in the UI.
 */
export type Teammate = {
  id: string;
  name: string;
  email: string;
  /** Whether the teammate is currently available to take work (shown in the picker). */
  isAvailable: boolean;
  avatarUrl: string | null;
};
