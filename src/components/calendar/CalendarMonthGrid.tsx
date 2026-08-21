"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTypeMeta, type CalendarEntry } from "./CalendarEntryRow";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function CalendarMonthGrid({
  entries,
  selectedDate,
  onSelectDate,
}: {
  entries: CalendarEntry[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = toDateKey(new Date(entry.date));
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const weeks = useMemo(() => {
    const firstOfMonth = visibleMonth;
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - startOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    const result: Date[][] = [];
    for (let i = 0; i < 6; i++) {
      result.push(days.slice(i * 7, i * 7 + 7));
    }
    return result;
  }, [visibleMonth]);

  const today = new Date();

  return (
    <div className="bg-paper-raised border border-line rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="font-display text-lg text-ink">
          {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
            }
            aria-label="Previous month"
            className="p-1.5 rounded hover:bg-paper text-ink-soft hover:text-ink"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              onSelectDate(toDateKey(now));
            }}
            className="text-xs font-medium text-ink-soft hover:text-ink px-2 py-1 rounded hover:bg-paper"
          >
            Today
          </button>
          <button
            onClick={() =>
              setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
            }
            aria-label="Next month"
            className="p-1.5 rounded hover:bg-paper text-ink-soft hover:text-ink"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-ink-soft py-2 border-r border-line last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-line last:border-b-0">
          {week.map((day, di) => {
            const key = toDateKey(day);
            const dayEntries = entriesByDay.get(key) ?? [];
            const inCurrentMonth = day.getMonth() === visibleMonth.getMonth();
            const isToday = isSameDay(day, today);
            const isSelected = key === selectedDate;
            const overflow = dayEntries.length > 3;
            const visibleEntries = dayEntries.slice(0, 3);

            return (
              <button
                key={di}
                onClick={() => onSelectDate(key)}
                className={`min-h-[84px] p-1.5 text-left border-r border-line last:border-r-0 hover:bg-paper transition-colors ${
                  isSelected ? "bg-sage-soft" : ""
                } ${!inCurrentMonth ? "opacity-40" : ""}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-mono tabular ${
                    isToday ? "bg-brick text-paper-raised" : "text-ink"
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {visibleEntries.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-1 text-[10px] text-ink-soft truncate"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getTypeMeta(e.type).dotClass}`} />
                      <span className="truncate">{e.title}</span>
                    </div>
                  ))}
                  {overflow && (
                    <p className="text-[10px] text-ink-soft">+{dayEntries.length - 3} more</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
