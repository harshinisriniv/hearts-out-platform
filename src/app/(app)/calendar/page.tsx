import { db } from "@/db";
import { volunteers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { CalendarClient } from "@/components/calendar/CalendarClient";
import { getCalendarEntries } from "@/lib/getCalendarEntries";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  let entries, allVolunteers;

  try {
    [entries, allVolunteers] = await Promise.all([
      getCalendarEntries(),
      db.select({ id: volunteers.id, name: volunteers.name, email: volunteers.email }).from(volunteers).orderBy(asc(volunteers.name)),
    ]);
  } catch (err) {
    console.error("CALENDAR PAGE DATA FETCH ERROR:", err);
    throw new Error(
      err instanceof Error
        ? `Calendar failed to load: ${err.message}`
        : "Calendar failed to load — check the terminal for the full error."
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">Calendar</p>
        <h1 className="font-display text-3xl text-ink">Everything coming up</h1>
      </header>

      <CalendarClient entries={entries} volunteerOptions={allVolunteers} />
    </div>
  );
}
