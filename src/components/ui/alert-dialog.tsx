"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type AlertDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function AlertDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onClose,
  onConfirm,
}: AlertDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Close dialog"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-border/50 bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted"
          aria-label="Close dialog"
        >
          <X className="size-5" />
        </button>

        <div className="space-y-4 text-center">
          <div>
            <p className="eyebrow">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
