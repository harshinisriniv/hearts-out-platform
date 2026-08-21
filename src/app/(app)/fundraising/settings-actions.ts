"use server";

import { db } from "@/db";
import { orgSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getOrgSettings() {
  const [existing] = await db.select().from(orgSettings).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(orgSettings).values({}).returning();
  return created;
}

export async function updateLowBalanceThreshold(threshold: number) {
  const existing = await getOrgSettings();
  await db
    .update(orgSettings)
    .set({ lowBalanceThreshold: String(threshold) })
    .where(eq(orgSettings.id, existing.id));

  revalidatePath("/fundraising");
  revalidatePath("/");
}
