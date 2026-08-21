import { db } from "@/db";
import { events, partners, distributions, kitTemplates, tasks, taskAssignees, volunteers } from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import type { CalendarEntry } from "@/components/calendar/CalendarEntryRow";

function toISODate(date: Date): string {
  return date.toISOString();
}

export async function getCalendarEntries(): Promise<CalendarEntry[]> {
  const [allEvents, followUpPartners, upcomingDeliveries, allTasks, allAssignments] = await Promise.all([
    db.select({ id: events.id, name: events.name, type: events.type, eventDate: events.eventDate }).from(events),
    db
      .select({ id: partners.id, name: partners.name, nextFollowUpAt: partners.nextFollowUpAt })
      .from(partners)
      .where(isNotNull(partners.nextFollowUpAt)),
    db
      .select({
        id: distributions.id,
        partnerId: distributions.partnerId,
        partnerName: partners.name,
        kitTemplateName: kitTemplates.name,
        kitCount: distributions.kitCount,
        distributedAt: distributions.distributedAt,
        volunteerName: volunteers.name,
      })
      .from(distributions)
      .innerJoin(partners, eq(distributions.partnerId, partners.id))
      .leftJoin(kitTemplates, eq(distributions.kitTemplateId, kitTemplates.id))
      .leftJoin(volunteers, eq(distributions.assignedVolunteerId, volunteers.id))
      .where(eq(distributions.isDelivered, false)),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        dueDate: tasks.dueDate,
        status: tasks.status,
      })
      .from(tasks),
    db
      .select({
        taskId: taskAssignees.taskId,
        volunteerId: taskAssignees.volunteerId,
        volunteerName: volunteers.name,
      })
      .from(taskAssignees)
      .innerJoin(volunteers, eq(taskAssignees.volunteerId, volunteers.id)),
  ]);

  return [
    ...allEvents.map((e) => ({
      id: `event-${e.id}`,
      date: toISODate(e.eventDate),
      type: "event" as const,
      title: e.name,
      subtitle: e.type === "restaurant_night" ? "Restaurant profit-share night" : "Fundraiser",
      isDone: false,
      href: "/fundraising",
      taskId: null,
      taskData: null,
    })),
    ...followUpPartners.map((p) => ({
      id: `followup-${p.id}`,
      date: toISODate(p.nextFollowUpAt!),
      type: "follow_up" as const,
      title: `Follow up with ${p.name}`,
      subtitle: null,
      isDone: false,
      href: `/partners/${p.id}`,
      taskId: null,
      taskData: null,
    })),
    ...upcomingDeliveries.map((d) => ({
      id: `delivery-${d.id}`,
      date: toISODate(d.distributedAt),
      type: "delivery" as const,
      title: `Deliver ${d.kitCount} ${d.kitTemplateName ?? "kits"} to ${d.partnerName}`,
      subtitle: d.volunteerName ? `Assigned: ${d.volunteerName}` : "Unassigned",
      isDone: false,
      href: `/partners/${d.partnerId}`,
      taskId: null,
      taskData: null,
    })),
    ...allTasks.map((t) => {
      const assignees = allAssignments.filter((a) => a.taskId === t.id);
      return {
        id: `task-${t.id}`,
        date: t.dueDate ? toISODate(t.dueDate) : toISODate(new Date()),
        type: "task" as const,
        title: t.title,
        subtitle:
          assignees.length > 0
            ? `Assigned: ${assignees.map((a) => a.volunteerName).join(", ")}`
            : "Unassigned",
        isDone: t.status === "done",
        href: null,
        taskId: t.id,
        taskData: {
          id: t.id,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
          assignedVolunteerIds: assignees.map((a) => a.volunteerId),
        },
      };
    }),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
