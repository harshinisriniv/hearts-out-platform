import { db } from "@/db";
import { volunteers, tasks, taskAssignees, distributions } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { VolunteersClient, type VolunteerRow } from "@/components/volunteers/VolunteersClient";

export const dynamic = "force-dynamic";

export default async function VolunteersPage() {
  const [allVolunteers, openTaskAssignments, allDeliveries] = await Promise.all([
    db.select().from(volunteers).orderBy(asc(volunteers.name)),
    db
      .select({ volunteerId: taskAssignees.volunteerId })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(eq(tasks.status, "todo")),
    db
      .select({ id: distributions.id, assignedVolunteerId: distributions.assignedVolunteerId })
      .from(distributions)
      .where(eq(distributions.isDelivered, false)),
  ]);

  const volunteerRows: VolunteerRow[] = allVolunteers.map((v) => ({
    id: v.id,
    name: v.name,
    email: v.email,
    phone: v.phone,
    isActive: v.isActive,
    activeTaskCount: openTaskAssignments.filter((t) => t.volunteerId === v.id).length,
    upcomingDeliveryCount: allDeliveries.filter((d) => d.assignedVolunteerId === v.id).length,
  }));

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">Volunteers</p>
        <h1 className="font-display text-3xl text-ink">Who&apos;s helping</h1>
      </header>

      <VolunteersClient volunteers={volunteerRows} />
    </div>
  );
}
