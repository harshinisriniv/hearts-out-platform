"use server";

import { db } from "@/db";
import { tasks, volunteers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendTaskAssignmentEmail } from "@/lib/resend";

export type TaskInput = {
  title: string;
  description: string;
  dueDate: string | null; // yyyy-mm-dd
  assignedVolunteerId: number | null;
};

async function notifyIfAssigned(
  taskId: number,
  assignedVolunteerId: number | null,
  title: string,
  description: string,
  dueDate: string | null
) {
  if (!assignedVolunteerId) return;

  const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.id, assignedVolunteerId));
  if (!volunteer?.email) return;

  try {
    await sendTaskAssignmentEmail({
      to: volunteer.email,
      volunteerName: volunteer.name,
      taskTitle: title,
      taskDescription: description || null,
      dueDate,
    });
    await db.update(tasks).set({ notifiedAt: new Date() }).where(eq(tasks.id, taskId));
  } catch (err) {
    // Task still saves even if the email fails
    console.error("Failed to send task assignment email", err);
  }
}

export async function createTask(input: TaskInput) {
  if (!input.title.trim()) throw new Error("Title is required");

  const [created] = await db
    .insert(tasks)
    .values({
      title: input.title.trim(),
      description: input.description.trim() || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assignedVolunteerId: input.assignedVolunteerId,
    })
    .returning({ id: tasks.id });

  await notifyIfAssigned(
    created.id,
    input.assignedVolunteerId,
    input.title,
    input.description,
    input.dueDate
  );

  revalidatePath("/calendar");
}

export async function updateTask(id: number, input: TaskInput, previousAssigneeId: number | null) {
  if (!id || !input.title.trim()) throw new Error("Missing required fields");

  await db
    .update(tasks)
    .set({
      title: input.title.trim(),
      description: input.description.trim() || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assignedVolunteerId: input.assignedVolunteerId,
    })
    .where(eq(tasks.id, id));

  // Only email if the assignee actually changed to someone new
  if (input.assignedVolunteerId && input.assignedVolunteerId !== previousAssigneeId) {
    await notifyIfAssigned(
      id,
      input.assignedVolunteerId,
      input.title,
      input.description,
      input.dueDate
    );
  }

  revalidatePath("/calendar");
}

export async function toggleTaskDone(id: number, done: boolean) {
  await db
    .update(tasks)
    .set({ status: done ? "done" : "todo" })
    .where(eq(tasks.id, id));
  revalidatePath("/calendar");
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/calendar");
}
