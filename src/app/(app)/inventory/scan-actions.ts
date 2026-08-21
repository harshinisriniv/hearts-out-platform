"use server";

import { db } from "@/db";
import { items, scanLogs, inventoryTransactions } from "@/db/schema";
import { anthropic, VISION_MODEL } from "@/lib/anthropic";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function toWordSet(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word));
}

// True if every word in the shorter name appears in the longer one, e.g. "Tampons" <-> "Kotex Tampons"
function namesLikelyMatch(a: string, b: string): boolean {
  const wordsA = toWordSet(a);
  const wordsB = toWordSet(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  const longerSet = new Set(longer);
  return shorter.every((word) => longerSet.has(word));
}

export type DetectedItem = {
  detectedName: string;
  estimatedQuantity: number;
  countSource: "printed_label" | "visual_estimate";
  category: string;
  confidence: "high" | "medium" | "low";
  matchedItemId: number | null;
  matchedItemName: string | null;
};

const DETECT_TOOL = {
  name: "record_detected_items",
  description:
    "Record every distinct donation/hygiene item visible in the photo, with an estimated count for each.",
  input_schema: {
    type: "object" as const,
    properties: {
      scanType: {
        type: "string",
        enum: ["single_item", "batch"],
        description:
          "single_item if the photo shows one item (or one stack of identical items), batch if it shows a box/table with multiple different item types",
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            detectedName: {
              type: "string",
              description:
                "The GENERIC product type only — never a brand name. E.g. 'Tampons', 'Toothpaste', 'Bandages'. Whether the box says Kotex, Always, Tampax, Crest, Colgate, or anything else, ignore the brand entirely and record only the generic category of product (Tampons, Toothpaste, etc). Two different brands of the same product must produce the exact same detectedName.",
            },
            estimatedQuantity: {
              type: "integer",
              description:
                "The quantity of this item. If a box, package, or label states a printed count (e.g. '24 count', 'Qty: 100', 'Pack of 12'), read that number exactly and multiply by however many identical boxes/packages are visible — this is precise, not an estimate. Only estimate visually (counting individual visible units, or judging density for partially obscured/stacked items) when no printed count is present anywhere on the packaging.",
            },
            countSource: {
              type: "string",
              enum: ["printed_label", "visual_estimate"],
              description:
                "'printed_label' if this number came from reading a count printed on the box/package itself. 'visual_estimate' if it was judged by looking at the items directly with no printed count available.",
            },
            category: {
              type: "string",
              enum: ["Hygiene", "Clothing", "Food", "First Aid", "Other"],
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description:
                "Should be 'high' whenever countSource is printed_label and the text was clearly legible.",
            },
          },
          required: [
            "detectedName",
            "estimatedQuantity",
            "countSource",
            "category",
            "confidence",
          ],
        },
      },
    },
    required: ["scanType", "items"],
  },
};

export async function analyzeDonationPhoto(
  formData: FormData
): Promise<{ scanType: string; detections: DetectedItem[] }> {
  const file = formData.get("image") as File | null;
  if (!file) throw new Error("No image provided");

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = file.type || "image/jpeg";

  const existingItems = await db
    .select({ id: items.id, name: items.name })
    .from(items);
  const existingNames = existingItems.map((i) => i.name).join(", ") || "none yet";

  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 2048,
    tools: [DETECT_TOOL],
    tool_choice: { type: "tool", name: "record_detected_items" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64,
            },
          },
          {
            type: "text",
            text: `This is a photo of donated supply items for a homeless-services nonprofit. Identify every distinct item type visible and determine quantities. This may be a single item, a stack of one item, or a whole box/table of mixed donations — handle either case.

Never include a brand name in detectedName. Record only the generic product type — "Tampons" not "Kotex Tampons" or "Always Tampons," "Toothpaste" not "Crest Toothpaste." The nonprofit doesn't track by brand, only by product type, so two different brands of the same thing must always produce the identical detectedName.

Quantity precision matters a lot here. Before estimating anything visually: look carefully for printed counts on boxes, packaging, or labels (e.g. "24 count", "Qty: 100", "Pack of 12", case-pack numbers). If you find one, read it exactly and multiply by the number of identical boxes/packages visible — treat this as precise, and mark countSource as "printed_label". Only fall back to visually estimating individual units or judging density (countSource "visual_estimate") when no printed count is legible anywhere on that item's packaging.

Classify category by what the item actually is, not by assuming everything is Hygiene:
- Hygiene: toothbrushes, toothpaste, soap, shampoo, deodorant, tampons, pads, wipes, lip balm, floss, razors
- First Aid: bandages, gauze, antiseptic, pain relievers, first-aid kits — anything for treating an injury, even though it may sit near hygiene items in a donation box
- Food: canned goods, snack bars, bottled water, any consumable
- Clothing: socks, shirts, jackets, underwear, blankets
- Other: anything that doesn't fit the above

The nonprofit's existing inventory item names are: ${existingNames}. When an item you see matches one of these by product type (ignoring any brand printed on it), use that exact existing name as detectedName so it gets added to that item's stock rather than creating a duplicate.`,
          },
        ],
      },
    ],
  });

  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use"
  );
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("Model did not return structured item data");
  }

  const parsed = toolUseBlock.input as {
    scanType: string;
    items: Array<{
      detectedName: string;
      estimatedQuantity: number;
      countSource: "printed_label" | "visual_estimate";
      category: string;
      confidence: "high" | "medium" | "low";
    }>;
  };

  // Word-subset match so a brand name like "Kotex Tampons" still hits an existing "Tampons" item
  const detections: DetectedItem[] = parsed.items.map((d) => {
    const match = existingItems.find((i) =>
      namesLikelyMatch(d.detectedName, i.name)
    );
    return {
      detectedName: d.detectedName,
      estimatedQuantity: d.estimatedQuantity,
      countSource: d.countSource,
      category: d.category,
      confidence: d.confidence,
      matchedItemId: match?.id ?? null,
      matchedItemName: match?.name ?? null,
    };
  });

  return { scanType: parsed.scanType, detections };
}

export async function commitScan(payload: {
  scanType: string;
  confirmedItems: Array<{
    matchedItemId: number | null;
    name: string;
    category: string;
    unit: string;
    quantity: number;
  }>;
}) {
  const { scanType, confirmedItems } = payload;

  const [scanLog] = await db
    .insert(scanLogs)
    .values({
      scanType,
      itemsDetected: confirmedItems,
      status: "confirmed",
    })
    .returning({ id: scanLogs.id });

  for (const item of confirmedItems) {
    if (item.quantity <= 0) continue;

    if (item.matchedItemId) {
      const [existing] = await db
        .select()
        .from(items)
        .where(eq(items.id, item.matchedItemId));
      if (!existing) continue;

      await db
        .update(items)
        .set({
          quantity: existing.quantity + item.quantity,
          updatedAt: new Date(),
        })
        .where(eq(items.id, item.matchedItemId));

      await db.insert(inventoryTransactions).values({
        itemId: item.matchedItemId,
        delta: item.quantity,
        reason: "scan",
        sourceId: scanLog.id,
        notes: `Added via photo scan`,
      });
    } else {
      const [created] = await db
        .insert(items)
        .values({
          name: item.name,
          category: item.category,
          unit: item.unit || "each",
          quantity: item.quantity,
          lowStockThreshold: 10,
        })
        .returning({ id: items.id });

      await db.insert(inventoryTransactions).values({
        itemId: created.id,
        delta: item.quantity,
        reason: "scan",
        sourceId: scanLog.id,
        notes: `New item created via photo scan`,
      });
    }
  }

  revalidatePath("/inventory");
  revalidatePath("/");
}
