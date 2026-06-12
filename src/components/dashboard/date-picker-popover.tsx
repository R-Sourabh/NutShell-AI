"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerPopoverProps {
  currentDate?: string | null;
  onSave: (date: Date) => void;
  onClose: () => void;
}

export function DatePickerPopover({
  currentDate,
  onSave,
  onClose,
}: DatePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Parse initial date
  const initialDate = currentDate ? new Date(currentDate) : new Date();
  const isValidDate = !isNaN(initialDate.getTime());
  const activeDate = isValidDate ? initialDate : new Date();

  const [selectedDate, setSelectedDate] = useState<Date>(activeDate);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    new Date(activeDate.getFullYear(), activeDate.getMonth(), 1)
  );

  // Time format "HH:MM"
  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  const [timeValue, setTimeValue] = useState<string>(formatTime(activeDate));

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

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setVisibleMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setVisibleMonth(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const paddingArray = Array.from({ length: firstDayIndex });

  const handleDayClick = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedDate(new Date(year, month, day));
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const [hours, minutes] = timeValue.split(":").map(Number);
    const finalDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes
    );
    onSave(finalDate);
  };

  return (
    <div
      ref={popoverRef}
      onClick={(e) => {
        // Prevent clicking inside the calendar from bubble-up triggers
        e.stopPropagation();
      }}
      className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[24px] border-2 border-border bg-card p-4 text-foreground shadow-[6px_6px_0px_0px_var(--border)] focus:outline-none"
    >
      {/* Popover Header */}
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
          Select Due Date
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-lg border border-border/70 p-1 hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="min-w-[85px] text-center text-xs font-bold font-mono">
            {monthNames[month].substring(0, 3)} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg border border-border/70 p-1 hover:bg-secondary transition-colors"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {paddingArray.map((_, i) => (
          <div key={`pad-${i}`} className="py-1.5" />
        ))}
        {daysArray.map((day) => {
          const isSelected =
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === month &&
            selectedDate.getFullYear() === year;

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={(e) => handleDayClick(day, e)}
              className={cn(
                "rounded-lg py-1.5 font-medium transition-all hover:bg-secondary hover:scale-105 active:scale-95",
                isSelected
                  ? "bg-primary text-primary-foreground font-bold border border-primary hover:bg-primary/95"
                  : "border border-transparent"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="my-3 border-t-2 border-dashed border-border/20" />

      {/* Time Picker */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold font-mono text-muted-foreground">
          <Clock className="size-3.5 text-accent" />
          Time:
        </label>
        <input
          type="time"
          value={timeValue}
          onChange={(e) => setTimeValue(e.target.value)}
          className="rounded-xl border-2 border-border bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="flex-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="xs"
          className="flex-1 text-xs"
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
