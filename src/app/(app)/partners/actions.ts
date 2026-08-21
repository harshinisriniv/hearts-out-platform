"use server";

import { db } from "@/db";
import { partners, distributions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type PartnerInput = {
  name: string;
  type: string;
  address: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  preferredKitTemplateId: number | null;
  typicalKitsRequested: number | null;
  notes: string;
  nextFollowUpAt: string | null; // ISO date string from a date input
};

function toNullableDate(value: string | null) {
  return value ? new Date(value) : null;
}

export async function createPartner(input: PartnerInput) {
  if (!input.name.trim()) throw new Error("Organization name is required");

  await db.insert(partners).values({
    name: input.name.trim(),
    type: input.type,
    address: input.address.trim() || null,
    primaryContactName: input.primaryContactName.trim() || null,
    primaryContactPhone: input.primaryContactPhone.trim() || null,
    primaryContactEmail: input.primaryContactEmail.trim() || null,
    preferredKitTemplateId: input.preferredKitTemplateId,
    typicalKitsRequested: input.typicalKitsRequested,
    notes: input.notes.trim() || null,
    nextFollowUpAt: toNullableDate(input.nextFollowUpAt),
  });

  revalidatePath("/partners");
}

export async function updatePartner(id: number, input: PartnerInput) {
  if (!id || !input.name.trim()) throw new Error("Missing required fields");

  await db
    .update(partners)
    .set({
      name: input.name.trim(),
      type: input.type,
      address: input.address.trim() || null,
      primaryContactName: input.primaryContactName.trim() || null,
      primaryContactPhone: input.primaryContactPhone.trim() || null,
      primaryContactEmail: input.primaryContactEmail.trim() || null,
      preferredKitTemplateId: input.preferredKitTemplateId,
      typicalKitsRequested: input.typicalKitsRequested,
      notes: input.notes.trim() || null,
      nextFollowUpAt: toNullableDate(input.nextFollowUpAt),
    })
    .where(eq(partners.id, id));

  revalidatePath("/partners");
}

export async function deletePartner(id: number) {
  await db.delete(partners).where(eq(partners.id, id));
  revalidatePath("/partners");
}

export async function scheduleDelivery(payload: {
  partnerId: number;
  kitTemplateId: number | null;
  kitCount: number;
  distributedAt: string; // ISO date+time string — when it's scheduled for
  assignedVolunteerId: number | null;
  isDelivered: boolean; // true if logging something that already happened
  notes: string;
}) {
  if (!payload.partnerId || payload.kitCount <= 0) {
    throw new Error("Missing required fields");
  }

  const scheduledDate = new Date(payload.distributedAt);

  await db.insert(distributions).values({
    partnerId: payload.partnerId,
    kitTemplateId: payload.kitTemplateId,
    kitCount: payload.kitCount,
    distributedAt: scheduledDate,
    assignedVolunteerId: payload.assignedVolunteerId,
    isDelivered: payload.isDelivered,
    deliveredAt: payload.isDelivered ? scheduledDate : null,
    notes: payload.notes.trim() || null,
  });

  // Only count this as "contact" once it's actually happened, not just scheduled
  if (payload.isDelivered) {
    await db
      .update(partners)
      .set({ lastContactedAt: scheduledDate })
      .where(eq(partners.id, payload.partnerId));
  }

  revalidatePath("/partners");
  revalidatePath("/");
}

export async function markDelivered(distributionId: number) {
  const [dist] = await db.select().from(distributions).where(eq(distributions.id, distributionId));
  if (!dist) throw new Error("Delivery not found");

  const now = new Date();

  await db
    .update(distributions)
    .set({ isDelivered: true, deliveredAt: now })
    .where(eq(distributions.id, distributionId));

  await db
    .update(partners)
    .set({ lastContactedAt: now })
    .where(eq(partners.id, dist.partnerId));

  revalidatePath("/partners");
  revalidatePath("/");
}

export async function deleteDelivery(distributionId: number) {
  await db.delete(distributions).where(eq(distributions.id, distributionId));
  revalidatePath("/partners");
  revalidatePath("/");
}
