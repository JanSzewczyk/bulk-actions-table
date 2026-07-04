"use client";

import { Toaster } from "@szum-tech/design-system/components/toaster";
import { useTheme } from "next-themes";

/**
 * Sonner reads `data-sonner-theme` from `prefers-color-scheme`, not from the `class="dark"`
 * attribute `next-themes` toggles — so a manually-selected app theme can diverge from the OS
 * scheme and leave the toast action/cancel buttons styled for the wrong theme (invisible on a
 * dark toast, since the DS `Toaster` only overrides the toast surface colors, not the button
 * ones). Forwarding `resolvedTheme` keeps sonner's own theme in sync with the app's.
 */
export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} />;
}
