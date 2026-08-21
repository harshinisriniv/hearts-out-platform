"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type EventInput = {
  name: string;
  type: string; // "fundraiser" | "restaurant_night" | "other"
  eventDate: string; // yyyy-mm-dd
  location: string;
  goalAmount: number | null;
  amountRaised: number;
  attendeeCount: number | null;
  notes: string;
};

export async function createEvent(input: EventInput) {
  if (!input.name.trim()) throw new Error("Event name is required");

  await db.insert(events).values({
    name: input.name.trim(),
    type: input.type,
    eventDate: new Date(input.eventDate),
    location: input.location.trim() || null,
    goalAmount: input.goalAmount !== null ? String(input.goalAmount) : null,
    amountRaised: String(input.amountRaised),
    attendeeCount: input.attendeeCount,
    notes: input.notes.trim() || null,
  });

  revalidatePath("/fundraising");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updateEvent(id: number, input: EventInput) {
  if (!id || !input.name.trim()) throw new Error("Missing required fields");

  await db
    .update(events)
    .set({
      name: input.name.trim(),
      type: input.type,
      eventDate: new Date(input.eventDate),
      location: input.location.trim() || null,
      goalAmount: input.goalAmount !== null ? String(input.goalAmount) : null,
      amountRaised: String(input.amountRaised),
      attendeeCount: input.attendeeCount,
      notes: input.notes.trim() || null,
    })
    .where(eq(events.id, id));

  revalidatePath("/fundraising");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteEvent(id: number) {
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/fundraising");
  revalidatePath("/calendar");
  revalidatePath("/");
}
