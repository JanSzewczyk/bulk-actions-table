"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@szum-tech/design-system/components/alert-dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onOpenChange(open: boolean): void;
  onConfirm(): void;
  /**
   * There's no `AlertDialogTrigger` here (open state is controlled by the caller), so Radix has no
   * trigger element to return focus to on close — without this, focus falls back to `<body>` instead
   * of the button that opened the dialog.
   */
  onCloseAutoFocus?(event: Event): void;
};

/**
 * Generic confirmation gate for a bulk action. Required for delete unconditionally, and for
 * archive/assign only when the selection is `mode: 'all'` — the caller decides when to open it.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onOpenChange,
  onConfirm,
  onCloseAutoFocus
}: ConfirmDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
