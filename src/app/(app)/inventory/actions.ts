"use server";

import { db } from "@/db";
import { items, inventoryTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createItem(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const unit = String(formData.get("unit") || "each").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const lowStockThreshold = Number(formData.get("lowStockThreshold") || 10);

  if (!name || !category) {
    throw new Error("Name and category are required");
  }

  const [created] = await db
    .insert(items)
    .values({ name, category, unit, quantity, lowStockThreshold })
    .returning({ id: items.id });

  if (quantity > 0) {
    await db.insert(inventoryTransactions).values({
      itemId: created.id,
      delta: quantity,
      reason: "manual",
      notes: "Initial stock on item creation",
    });
  }

  revalidatePath("/inventory");
}

export async function updateItem(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const unit = String(formData.get("unit") || "each").trim();
  const lowStockThreshold = Number(formData.get("lowStockThreshold") || 10);

  if (!id || !name || !category) {
    throw new Error("Missing required fields");
  }

  await db
    .update(items)
    .set({ name, category, unit, lowStockThreshold, updatedAt: new Date() })
    .where(eq(items.id, id));

  revalidatePath("/inventory");
}

export async function deleteItem(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) throw new Error("Missing item id");

  await db.delete(items).where(eq(items.id, id));
  revalidatePath("/inventory");
}

export async function adjustQuantity(
  itemId: number,
  delta: number,
  reason: string = "manual",
  notes?: string
) {
  if (!itemId || delta === 0) return;

  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item) throw new Error("Item not found");

  const newQuantity = Math.max(0, item.quantity + delta);
  const actualDelta = newQuantity - item.quantity;

  await db
    .update(items)
    .set({ quantity: newQuantity, updatedAt: new Date() })
    .where(eq(items.id, itemId));

  if (actualDelta !== 0) {
    await db.insert(inventoryTransactions).values({
      itemId,
      delta: actualDelta,
      reason,
      notes,
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/");
}
