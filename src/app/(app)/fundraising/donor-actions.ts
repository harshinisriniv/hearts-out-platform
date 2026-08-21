"use server";

import { db } from "@/db";
import { donors, donations, donationLineItems, items, inventoryTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type DonorInput = {
  name: string;
  donorType: string; // "individual" | "company"
  email: string;
  phone: string;
  isAnonymous: boolean;
  notes: string;
};

export async function createDonor(input: DonorInput) {
  await db.insert(donors).values({
    name: input.isAnonymous ? null : input.name.trim() || null,
    donorType: input.donorType,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    isAnonymous: input.isAnonymous,
    notes: input.notes.trim() || null,
  });

  revalidatePath("/fundraising");
}

export async function updateDonor(id: number, input: DonorInput) {
  if (!id) throw new Error("Missing donor id");

  await db
    .update(donors)
    .set({
      name: input.isAnonymous ? null : input.name.trim() || null,
      donorType: input.donorType,
      email: input.email.trim() || null,
      phone: input.phone.trim() || null,
      isAnonymous: input.isAnonymous,
      notes: input.notes.trim() || null,
    })
    .where(eq(donors.id, id));

  revalidatePath("/fundraising");
}

export async function deleteDonor(id: number) {
  await db.delete(donors).where(eq(donors.id, id));
  revalidatePath("/fundraising");
}

async function resolveItemId(itemId: number | null, itemName: string, category: string): Promise<number> {
  if (itemId) return itemId;

  const trimmed = itemName.trim();
  const [existing] = await db.select().from(items).where(eq(items.name, trimmed));
  if (existing) return existing.id;

  const [created] = await db
    .insert(items)
    .values({ name: trimmed, category, unit: "each", quantity: 0, lowStockThreshold: 10 })
    .returning({ id: items.id });
  return created.id;
}

export type DonationLineItemInput = {
  itemId: number | null;
  itemName: string;
  category: string;
  quantityDonated: number;
};

export type DonationInput = {
  donorId: number | null;
  eventId: number | null;
  type: string; // "cash" | "check" | "online" | "item"
  amount: number | null;
  itemDescription: string; // free-text note for anything not itemized
  donatedAt: string; // yyyy-mm-dd
  notes: string;
  lineItems: DonationLineItemInput[]; // only used when type === "item"
};

export async function logDonation(input: DonationInput) {
  if (input.type !== "item" && (input.amount === null || input.amount <= 0)) {
    throw new Error("Enter a donation amount");
  }

  const [donation] = await db
    .insert(donations)
    .values({
      donorId: input.donorId,
      eventId: input.eventId,
      type: input.type,
      amount: input.amount !== null ? String(input.amount) : null,
      itemDescription: input.itemDescription.trim() || null,
      donatedAt: new Date(input.donatedAt),
      notes: input.notes.trim() || null,
    })
    .returning({ id: donations.id });

  if (input.type === "item") {
    for (const li of input.lineItems) {
      if (li.quantityDonated <= 0) continue;
      const resolvedItemId = await resolveItemId(li.itemId, li.itemName, li.category);

      await db.insert(donationLineItems).values({
        donationId: donation.id,
        itemId: resolvedItemId,
        quantityDonated: li.quantityDonated,
      });

      const [existing] = await db.select().from(items).where(eq(items.id, resolvedItemId));
      if (!existing) continue;

      await db
        .update(items)
        .set({ quantity: existing.quantity + li.quantityDonated, updatedAt: new Date() })
        .where(eq(items.id, resolvedItemId));

      await db.insert(inventoryTransactions).values({
        itemId: resolvedItemId,
        delta: li.quantityDonated,
        reason: "donation",
        sourceId: donation.id,
        notes: "Item donation",
      });
    }
  }

  revalidatePath("/fundraising");
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function deleteDonation(id: number) {
  await db.delete(donations).where(eq(donations.id, id));
  revalidatePath("/fundraising");
  revalidatePath("/");
}
