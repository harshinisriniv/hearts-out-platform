"use client";

import Link from "next/link";
import { Check, Trash2, Pencil, AlertCircle } from "lucide-react";
import type { EditableTask } from "./TaskFormModal";
import { TYPE_META, getTypeMeta, type EntryType } from "@/lib/calendarTypeMeta";

export type { EntryType };
export { TYPE_META, getTypeMeta };

export type CalendarEntry = {
  id: string;
  date: string; // ISO date
  type: EntryType;
  title: string;
  subtitle: string | null;
  isDone: boolean;
  href: string | null;
  taskId: number | null;
  taskData: EditableTask | null;
};

function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export function CalendarEntryRow({
  entry,
  togglingId,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  entry: CalendarEntry;
  togglingId: number | null;
  onToggleDone: (taskId: number, currentlyDone: boolean) => void;
  onEdit: (task: EditableTask) => void;
  onDelete: (taskId: number) => void;
}) {
  const meta = getTypeMeta(entry.type);
  const Icon = meta.icon;
  const overdue = !entry.isDone && isPast(entry.date) && entry.type !== "event";
  const dateLabel = new Date(entry.date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const content = (
    <div
      className={`hang-tag ${meta.tagClass} p-3.5 flex items-center gap-3 ${
        entry.isDone ? "opacity-60" : ""
      }`}
    >
      {entry.type === "task" && entry.taskId ? (
        <button
          onClick={() => onToggleDone(entry.taskId!, entry.isDone)}
          disabled={togglingId === entry.taskId}
          aria-label={entry.isDone ? "Mark not done" : "Mark done"}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            entry.isDone ? "bg-sage border-sage" : "border-line"
          }`}
        >
          {entry.isDone && <Check className="w-3 h-3 text-paper-raised" />}
        </button>
      ) : (
        <Icon className={`w-4 h-4 shrink-0 ${meta.iconClass}`} />
      )}

      <div
        className={`flex-1 min-w-0 ${entry.type === "task" && entry.taskData ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (entry.type === "task" && entry.taskData) onEdit(entry.taskData);
        }}
      >
        <p className={`text-ink font-medium ${entry.isDone ? "line-through" : ""}`}>
          {entry.title}
        </p>
        {entry.subtitle && <p className="text-xs text-ink-soft">{entry.subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {overdue && <AlertCircle className="w-3.5 h-3.5 text-danger" />}
        <span
          className={`text-xs font-mono tabular whitespace-nowrap ${
            overdue ? "text-danger" : "text-ink-soft"
          }`}
        >
          {dateLabel}
        </span>
        {entry.type === "task" && entry.taskData && (
          <>
            <button
              onClick={() => onEdit(entry.taskData!)}
              aria-label="Edit task"
              className="text-ink-soft hover:text-ink p-1"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(entry.taskId!)}
              aria-label="Delete task"
              className="text-ink-soft hover:text-danger p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return entry.href && entry.type !== "task" ? (
    <Link href={entry.href} className="block">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
}
