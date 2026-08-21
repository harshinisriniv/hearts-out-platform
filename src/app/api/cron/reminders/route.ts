import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskAssignees, volunteers, distributions, partners, kitTemplates } from "@/db/schema";
import { and, eq, gte, lt, isNull, inArray } from "drizzle-orm";
import { sendReminderEmail } from "@/lib/resend";

// Runs once a day (see vercel.json) — 24-48h window so a daily cron never misses "due tomorrow"
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(windowStart.getHours() + 20); // ~tomorrow onward
  const windowEnd = new Date(now);
  windowEnd.setHours(windowEnd.getHours() + 44); // through about two days out

  let tasksReminded = 0;
  let deliveriesReminded = 0;

  // --- Task reminders ---
  const dueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "todo"),
        gte(tasks.dueDate, windowStart),
        lt(tasks.dueDate, windowEnd),
        isNull(tasks.reminderSentAt)
      )
    );

  for (const task of dueTasks) {
    const assignments = await db
      .select({ volunteerId: taskAssignees.volunteerId })
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, task.id));

    if (assignments.length === 0) continue;

    const assignedVolunteers = await db
      .select()
      .from(volunteers)
      .where(inArray(volunteers.id, assignments.map((a) => a.volunteerId)));

    for (const v of assignedVolunteers) {
      if (!v.email) continue;
      try {
        await sendReminderEmail({
          to: v.email,
          volunteerName: v.name,
          title: task.title,
          detail: task.description,
          whenLabel: "tomorrow",
        });
      } catch (err) {
        console.error("Failed to send task reminder", err);
      }
    }

    await db.update(tasks).set({ reminderSentAt: now }).where(eq(tasks.id, task.id));
    tasksReminded++;
  }

  // --- Delivery reminders ---
  const dueDeliveries = await db
    .select({
      id: distributions.id,
      kitCount: distributions.kitCount,
      distributedAt: distributions.distributedAt,
      assignedVolunteerId: distributions.assignedVolunteerId,
      partnerName: partners.name,
      kitTemplateName: kitTemplates.name,
    })
    .from(distributions)
    .innerJoin(partners, eq(distributions.partnerId, partners.id))
    .leftJoin(kitTemplates, eq(distributions.kitTemplateId, kitTemplates.id))
    .where(
      and(
        eq(distributions.isDelivered, false),
        gte(distributions.distributedAt, windowStart),
        lt(distributions.distributedAt, windowEnd),
        isNull(distributions.reminderSentAt)
      )
    );

  for (const delivery of dueDeliveries) {
    if (!delivery.assignedVolunteerId) continue;

    const [volunteer] = await db
      .select()
      .from(volunteers)
      .where(eq(volunteers.id, delivery.assignedVolunteerId));

    if (volunteer?.email) {
      try {
        await sendReminderEmail({
          to: volunteer.email,
          volunteerName: volunteer.name,
          title: `Deliver ${delivery.kitCount} ${delivery.kitTemplateName ?? "kits"} to ${delivery.partnerName}`,
          detail: null,
          whenLabel: "tomorrow",
        });
      } catch (err) {
        console.error("Failed to send delivery reminder", err);
      }
    }

    await db
      .update(distributions)
      .set({ reminderSentAt: now })
      .where(eq(distributions.id, delivery.id));
    deliveriesReminded++;
  }

  return NextResponse.json({ tasksReminded, deliveriesReminded });
}
