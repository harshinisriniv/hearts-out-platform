"use client";

import { useMemo, useState } from "react";
import { Plus, CalendarDays, List } from "lucide-react";
import { TaskFormModal, type EditableTask, type VolunteerOption } from "./TaskFormModal";
import { CalendarEntryRow, type CalendarEntry, type EntryType } from "./CalendarEntryRow";
import { CalendarMonthGrid } from "./CalendarMonthGrid";
import { toggleTaskDone, deleteTask } from "@/app/(app)/tasks/actions";

export type { CalendarEntry, EntryType } from "./CalendarEntryRow";

const FILTERS: { key: "all" | EntryType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "task", label: "Tasks" },
  { key: "delivery", label: "Deliveries" },
  { key: "event", label: "Events" },
  { key: "follow_up", label: "Follow-ups" },
];

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function isTodayOrFuture(dateStr: string): boolean {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

export function CalendarClient({
  entries,
  volunteerOptions,
}: {
  entries: CalendarEntry[];
  volunteerOptions: VolunteerOption[];
}) {
  const [filter, setFilter] = useState<"all" | EntryType>("all");
  const [view, setView] = useState<"month" | "agenda">("month");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [taskModalTarget, setTaskModalTarget] = useState<EditableTask | null | "new">(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.type === filter)),
    [entries, filter]
  );

  // Agenda is upcoming-only; past items still show in the month grid
  const upcomingOnly = useMemo(
    () => filtered.filter((e) => isTodayOrFuture(e.date)),
    [filtered]
  );

  const selectedDayEntries = useMemo(
    () =>
      filtered.filter((e) => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        return key === selectedDate;
      }),
    [filtered, selectedDate]
  );

  async function handleToggleDone(taskId: number, currentlyDone: boolean) {
    setTogglingId(taskId);
    try {
      await toggleTaskDone(taskId, !currentlyDone);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-brick text-paper-raised"
                  : "text-ink-soft hover:bg-paper-raised"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-line rounded-md p-0.5">
            <button
              onClick={() => setView("month")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                view === "month" ? "bg-sage-soft text-sage" : "text-ink-soft"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Month
            </button>
            <button
              onClick={() => setView("agenda")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                view === "agenda" ? "bg-sage-soft text-sage" : "text-ink-soft"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Agenda
            </button>
          </div>
          <button
            onClick={() => setTaskModalTarget("new")}
            className="flex items-center gap-2 bg-brick text-paper-raised rounded-md px-4 py-2 text-sm font-medium hover:bg-brick-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add task
          </button>
        </div>
      </div>

      {view === "month" ? (
        <div>
          <CalendarMonthGrid
            entries={filtered}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <div className="mt-6">
            <h3 className="font-display text-base text-ink mb-3">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            {selectedDayEntries.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing scheduled this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEntries.map((entry) => (
                  <CalendarEntryRow
                    key={entry.id}
                    entry={entry}
                    togglingId={togglingId}
                    onToggleDone={handleToggleDone}
                    onEdit={setTaskModalTarget}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : upcomingOnly.length === 0 ? (
        <div className="hang-tag hang-tag--ochre p-6 bg-paper-raised text-center">
          <p className="text-ink-soft">Nothing coming up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingOnly.map((entry) => (
            <CalendarEntryRow
              key={entry.id}
              entry={entry}
              togglingId={togglingId}
              onToggleDone={handleToggleDone}
              onEdit={setTaskModalTarget}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}

      {taskModalTarget !== null && (
        <TaskFormModal
          task={taskModalTarget === "new" ? null : taskModalTarget}
          volunteerOptions={volunteerOptions}
          onClose={() => setTaskModalTarget(null)}
        />
      )}
    </div>
  );
}
