import { db } from "@/db";
import { items } from "@/db/schema";
import { asc } from "drizzle-orm";
import { InventoryClient } from "@/components/inventory/InventoryClient";
import { PageHero } from "@/components/PageHero";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const allItems = await db
    .select()
    .from(items)
    .orderBy(asc(items.category), asc(items.name));

  const categoryCount = new Set(allItems.map((i) => i.category)).size;

  return (
    <div className="p-8 max-w-5xl">
      <PageHero
        eyebrow="Inventory"
        title="What's on the shelves"
        tone="sage"
        chip={
          <span className="inline-flex font-mono font-bold text-sm text-paper-raised bg-ink/20 border-2 border-paper-raised rounded-full px-3.5 py-1.5">
            {allItems.length} item{allItems.length === 1 ? "" : "s"} &middot; {categoryCount}{" "}
            categor{categoryCount === 1 ? "y" : "ies"}
          </span>
        }
      />

      <InventoryClient items={allItems} />
    </div>
  );
}
