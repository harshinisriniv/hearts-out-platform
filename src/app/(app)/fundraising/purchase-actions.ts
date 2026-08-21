"use server";

import { db } from "@/db";
import { purchases, purchaseLineItems, items, inventoryTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { anthropic, VISION_MODEL } from "@/lib/anthropic";

export type PurchaseLineItemInput = {
  itemId: number | null; // null means "resolve/create by name"
  itemName: string; // used when itemId is null, or just for display when set
  category: string; // used only when creating a brand-new item
  quantityPurchased: number;
  lineTotal: number | null;
};

// Exact-match lookup by name, or creates a new item if none exists
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

export async function createPurchase(payload: {
  description: string;
  category: string;
  purchasedAt: string; // yyyy-mm-dd
  notes: string;
  receiptImage: string | null;
  taxAmount: number;
  lineItems: PurchaseLineItemInput[];
}) {
  const { description, category, purchasedAt, notes, receiptImage, taxAmount, lineItems } = payload;
  if (!description.trim()) throw new Error("Description is required");
  if (lineItems.length === 0) throw new Error("Add at least one item purchased");

  const subtotal = lineItems.reduce((sum, li) => sum + (li.lineTotal ?? 0), 0);
  const totalAmount = subtotal + taxAmount;

  const [purchase] = await db
    .insert(purchases)
    .values({
      description: description.trim(),
      category,
      totalAmount: String(totalAmount),
      taxAmount: String(taxAmount),
      purchasedAt: new Date(purchasedAt),
      notes: notes.trim() || null,
      receiptImage: receiptImage || null,
    })
    .returning({ id: purchases.id });

  for (const li of lineItems) {
    if (li.quantityPurchased <= 0) continue;
    const resolvedItemId = await resolveItemId(li.itemId, li.itemName, li.category);

    await db.insert(purchaseLineItems).values({
      purchaseId: purchase.id,
      itemId: resolvedItemId,
      quantityPurchased: li.quantityPurchased,
      lineTotal: li.lineTotal !== null ? String(li.lineTotal) : null,
    });

    const [existing] = await db.select().from(items).where(eq(items.id, resolvedItemId));
    if (!existing) continue;

    await db
      .update(items)
      .set({ quantity: existing.quantity + li.quantityPurchased, updatedAt: new Date() })
      .where(eq(items.id, resolvedItemId));

    await db.insert(inventoryTransactions).values({
      itemId: resolvedItemId,
      delta: li.quantityPurchased,
      reason: "purchase",
      sourceId: purchase.id,
      notes: `Purchased: ${description.trim()}`,
    });
  }

  revalidatePath("/fundraising");
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function updatePurchase(
  purchaseId: number,
  payload: {
    description: string;
    category: string;
    purchasedAt: string;
    notes: string;
    receiptImage: string | null;
    taxAmount: number;
    lineItems: PurchaseLineItemInput[];
  }
) {
  const { description, category, purchasedAt, notes, receiptImage, taxAmount, lineItems } = payload;
  if (!description.trim()) throw new Error("Description is required");
  if (lineItems.length === 0) throw new Error("Add at least one item purchased");

  // Reverse the old line items' inventory impact first, keyed by item id
  const oldLines = await db
    .select()
    .from(purchaseLineItems)
    .where(eq(purchaseLineItems.purchaseId, purchaseId));

  const oldQtyByItem = new Map<number, number>();
  for (const line of oldLines) {
    oldQtyByItem.set(line.itemId, (oldQtyByItem.get(line.itemId) ?? 0) + line.quantityPurchased);
  }

  // Resolve new line items to item ids, creating items as needed
  const resolvedNewLines: Array<{ itemId: number; quantityPurchased: number; lineTotal: number | null }> = [];
  const newQtyByItem = new Map<number, number>();
  for (const li of lineItems) {
    if (li.quantityPurchased <= 0) continue;
    const resolvedItemId = await resolveItemId(li.itemId, li.itemName, li.category);
    resolvedNewLines.push({ itemId: resolvedItemId, quantityPurchased: li.quantityPurchased, lineTotal: li.lineTotal });
    newQtyByItem.set(resolvedItemId, (newQtyByItem.get(resolvedItemId) ?? 0) + li.quantityPurchased);
  }

  // Apply the net delta per item (new - old) to inventory
  const allItemIds = new Set([...oldQtyByItem.keys(), ...newQtyByItem.keys()]);
  for (const itemId of allItemIds) {
    const delta = (newQtyByItem.get(itemId) ?? 0) - (oldQtyByItem.get(itemId) ?? 0);
    if (delta === 0) continue;

    const [existing] = await db.select().from(items).where(eq(items.id, itemId));
    if (!existing) continue;

    const newQuantity = Math.max(0, existing.quantity + delta);
    await db.update(items).set({ quantity: newQuantity, updatedAt: new Date() }).where(eq(items.id, itemId));

    await db.insert(inventoryTransactions).values({
      itemId,
      delta: newQuantity - existing.quantity,
      reason: "purchase",
      sourceId: purchaseId,
      notes: `Adjusted from editing purchase: ${description.trim()}`,
    });
  }

  // Replace the line item rows
  await db.delete(purchaseLineItems).where(eq(purchaseLineItems.purchaseId, purchaseId));
  if (resolvedNewLines.length > 0) {
    await db.insert(purchaseLineItems).values(
      resolvedNewLines.map((li) => ({
        purchaseId,
        itemId: li.itemId,
        quantityPurchased: li.quantityPurchased,
        lineTotal: li.lineTotal !== null ? String(li.lineTotal) : null,
      }))
    );
  }

  const subtotal = resolvedNewLines.reduce((sum, li) => sum + (li.lineTotal ?? 0), 0);
  const totalAmount = subtotal + taxAmount;

  await db
    .update(purchases)
    .set({
      description: description.trim(),
      category,
      totalAmount: String(totalAmount),
      taxAmount: String(taxAmount),
      purchasedAt: new Date(purchasedAt),
      notes: notes.trim() || null,
      receiptImage: receiptImage || null,
    })
    .where(eq(purchases.id, purchaseId));

  revalidatePath("/fundraising");
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function deletePurchase(purchaseId: number) {
  // Reverse the inventory this purchase added before deleting it
  const lines = await db
    .select()
    .from(purchaseLineItems)
    .where(eq(purchaseLineItems.purchaseId, purchaseId));

  for (const line of lines) {
    const [existing] = await db.select().from(items).where(eq(items.id, line.itemId));
    if (!existing) continue;

    const newQuantity = Math.max(0, existing.quantity - line.quantityPurchased);
    await db.update(items).set({ quantity: newQuantity, updatedAt: new Date() }).where(eq(items.id, line.itemId));

    await db.insert(inventoryTransactions).values({
      itemId: line.itemId,
      delta: newQuantity - existing.quantity,
      reason: "purchase",
      sourceId: purchaseId,
      notes: "Reversed — purchase deleted",
    });
  }

  await db.delete(purchases).where(eq(purchases.id, purchaseId)); // line items cascade

  revalidatePath("/fundraising");
  revalidatePath("/inventory");
  revalidatePath("/");
}

export type ScannedReceipt = {
  description: string;
  purchasedAt: string | null; // yyyy-mm-dd if legible
  taxAmount: number | null;
  lineItems: Array<{ itemName: string; quantity: number; lineTotal: number | null }>;
};

const RECEIPT_TOOL = {
  name: "record_receipt",
  description: "Record the details extracted from a purchase receipt photo.",
  input_schema: {
    type: "object" as const,
    properties: {
      description: {
        type: "string",
        description: "Store or merchant name, e.g. 'Costco', 'Target' — used as the purchase description",
      },
      purchasedAt: {
        type: ["string", "null"],
        description: "Date on the receipt in yyyy-mm-dd format, or null if not legible",
      },
      taxAmount: {
        type: ["number", "null"],
        description: "Tax amount on the receipt, or null if not shown",
      },
      lineItems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            itemName: {
              type: "string",
              description: "Generic product name (strip brand names and store SKU codes) — e.g. 'Toothpaste' not 'CREST TP 6OZ'",
            },
            quantity: { type: "integer" },
            lineTotal: { type: ["number", "null"] },
          },
          required: ["itemName", "quantity"],
        },
      },
    },
    required: ["description", "lineItems"],
  },
};

export async function analyzeReceipt(formData: FormData): Promise<ScannedReceipt> {
  const file = formData.get("image") as File | null;
  if (!file) throw new Error("No image provided");

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = file.type || "image/jpeg";

  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 1500,
    tools: [RECEIPT_TOOL],
    tool_choice: { type: "tool", name: "record_receipt" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          },
          {
            type: "text",
            text: "This is a photo of a store receipt for supplies purchased for a nonprofit. Extract the store name, date, tax amount, and each line item with quantity and price. Strip brand names and SKU/product codes from item names — use generic product types only (e.g. 'Toothpaste' not 'CREST TP 6OZ 4CT'). If a field isn't legible, use null rather than guessing.",
          },
        ],
      },
    ],
  });

  const toolUseBlock = response.content.find((block) => block.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("Couldn't read that receipt — try a clearer photo, or enter it manually.");
  }

  return toolUseBlock.input as ScannedReceipt;
}
