"use server";

import { db } from "@/db";
import { volunteers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createVolunteer(input: { name: string; email: string; phone: string }) {
  if (!input.name.trim()) throw new Error("Name is required");

  const [created] = await db
    .insert(volunteers)
    .values({
      name: input.name.trim(),
      email: input.email.trim() || null,
      phone: input.phone.trim() || null,
    })
    .returning();

  revalidatePath("/partners");
  revalidatePath("/calendar");
  revalidatePath("/volunteers");
  return created;
}

export async function updateVolunteer(
  id: number,
  input: { name: string; email: string; phone: string; isActive: boolean }
) {
  if (!id || !input.name.trim()) throw new Error("Name is required");

  await db
    .update(volunteers)
    .set({
      name: input.name.trim(),
      email: input.email.trim() || null,
      phone: input.phone.trim() || null,
      isActive: input.isActive,
    })
    .where(eq(volunteers.id, id));

  revalidatePath("/partners");
  revalidatePath("/calendar");
  revalidatePath("/volunteers");
  revalidatePath("/");
}

export async function deleteVolunteer(id: number) {
  await db.delete(volunteers).where(eq(volunteers.id, id));
  revalidatePath("/partners");
  revalidatePath("/calendar");
  revalidatePath("/volunteers");
  revalidatePath("/");
}
