import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTypeMeta } from "@/lib/calendarTypeMeta";
import type { CalendarEntry } from "@/components/calendar/CalendarEntryRow";

function isTodayOrFuture(dateStr: string): boolean {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

export function DashboardAgenda({ entries }: { entries: CalendarEntry[] }) {
  const upcoming = entries.filter((e) => isTodayOrFuture(e.date)).slice(0, 5);

  return (
    <div className="pop-card bg-paper-raised rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base text-ink">Coming up</h3>
        <Link
          href="/calendar"
          className="text-xs text-brick hover:text-brick-dark font-medium flex items-center gap-1"
        >
          Full calendar
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-ink-soft">Nothing on the horizon right now.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((entry) => {
            const meta = getTypeMeta(entry.type);
            const dateLabel = new Date(entry.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            return (
              <li key={entry.id} className="flex items-center gap-2 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotClass}`} />
                <span className="text-ink flex-1 truncate">{entry.title}</span>
                <span className="text-xs font-mono tabular text-ink-soft whitespace-nowrap">
                  {dateLabel}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
