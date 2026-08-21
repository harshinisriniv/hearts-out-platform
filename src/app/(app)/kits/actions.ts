"use server";

import { db } from "@/db";
import {
  kitTemplates,
  kitTemplateItems,
  kitBuilds,
  items,
  inventoryTransactions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type TemplateItemInput = {
  itemId: number;
  quantityPerKit: number;
};

export async function createKitTemplate(payload: {
  name: string;
  description: string;
  templateItems: TemplateItemInput[];
}) {
  const { name, description, templateItems } = payload;
  if (!name.trim()) throw new Error("Name is required");

  const [template] = await db
    .insert(kitTemplates)
    .values({ name: name.trim(), description: description.trim() || null })
    .returning({ id: kitTemplates.id });

  if (templateItems.length > 0) {
    await db.insert(kitTemplateItems).values(
      templateItems.map((ti) => ({
        kitTemplateId: template.id,
        itemId: ti.itemId,
        quantityPerKit: ti.quantityPerKit,
      }))
    );
  }

  revalidatePath("/kits");
}

export async function updateKitTemplate(payload: {
  id: number;
  name: string;
  description: string;
  templateItems: TemplateItemInput[];
}) {
  const { id, name, description, templateItems } = payload;
  if (!id || !name.trim()) throw new Error("Missing required fields");

  await db
    .update(kitTemplates)
    .set({ name: name.trim(), description: description.trim() || null })
    .where(eq(kitTemplates.id, id));

  // Just replace the whole list — templates are small, no need to diff
  await db.delete(kitTemplateItems).where(eq(kitTemplateItems.kitTemplateId, id));
  if (templateItems.length > 0) {
    await db.insert(kitTemplateItems).values(
      templateItems.map((ti) => ({
        kitTemplateId: id,
        itemId: ti.itemId,
        quantityPerKit: ti.quantityPerKit,
      }))
    );
  }

  revalidatePath("/kits");
}

export async function deleteKitTemplate(templateId: number) {
  await db.delete(kitTemplates).where(eq(kitTemplates.id, templateId));
  revalidatePath("/kits");
}

export async function buildKits(payload: {
  kitTemplateId: number;
  quantityToBuild: number;
}) {
  const { kitTemplateId, quantityToBuild } = payload;
  if (quantityToBuild <= 0) throw new Error("Quantity must be positive");

  const ingredients = await db
    .select({
      itemId: kitTemplateItems.itemId,
      quantityPerKit: kitTemplateItems.quantityPerKit,
      currentQuantity: items.quantity,
      itemName: items.name,
    })
    .from(kitTemplateItems)
    .innerJoin(items, eq(kitTemplateItems.itemId, items.id))
    .where(eq(kitTemplateItems.kitTemplateId, kitTemplateId));

  if (ingredients.length === 0) {
    throw new Error("This kit template has no items defined yet");
  }

  // Validate before touching anything
  for (const ing of ingredients) {
    const needed = ing.quantityPerKit * quantityToBuild;
    if (needed > ing.currentQuantity) {
      throw new Error(
        `Not enough ${ing.itemName} — need ${needed}, have ${ing.currentQuantity}`
      );
    }
  }

  const [build] = await db
    .insert(kitBuilds)
    .values({ kitTemplateId, quantityBuilt: quantityToBuild })
    .returning({ id: kitBuilds.id });

  for (const ing of ingredients) {
    const needed = ing.quantityPerKit * quantityToBuild;
    await db
      .update(items)
      .set({
        quantity: ing.currentQuantity - needed,
        updatedAt: new Date(),
      })
      .where(eq(items.id, ing.itemId));

    await db.insert(inventoryTransactions).values({
      itemId: ing.itemId,
      delta: -needed,
      reason: "kit_build",
      sourceId: build.id,
      notes: `Used to build ${quantityToBuild} kit(s)`,
    });
  }

  revalidatePath("/kits");
  revalidatePath("/inventory");
  revalidatePath("/");
}
