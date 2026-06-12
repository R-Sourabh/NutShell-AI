"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/mock-data";

interface PriorityPickerPopoverProps {
  currentPriority?: TaskPriority;
  onSave: (priority: TaskPriority) => void;
  onClose: () => void;
}

export function PriorityPickerPopover({
  currentPriority,
  onSave,
  onClose,
}: PriorityPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click away listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const priorities: { value: TaskPriority; label: string; tone: string }[] = [
    { value: "high", label: "High Priority", tone: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20" },
    { value: "medium", label: "Medium Priority", tone: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20" },
    { value: "low", label: "Low Priority", tone: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" },
  ];

  return (
    <div
      ref={popoverRef}
      onClick={(e) => {
        e.stopPropagation();
      }}
      className="absolute left-0 top-full z-50 mt-2 w-48 rounded-[20px] border-2 border-border bg-card p-2 text-foreground shadow-[4px_4px_0px_0px_var(--border)] focus:outline-none"
    >
      <div className="mb-2 px-2 pt-1">
        <h4 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
          Set Priority
        </h4>
      </div>
      <div className="flex flex-col gap-1">
        {priorities.map((p) => {
          const isSelected = currentPriority === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSave(p.value);
              }}
              className={cn(
                "w-full rounded-xl border px-3 py-2 text-left font-mono text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]",
                p.tone,
                isSelected ? "ring-2 ring-primary border-primary/50" : "border-border/70"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
