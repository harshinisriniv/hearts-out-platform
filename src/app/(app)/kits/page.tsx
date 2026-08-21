import { db } from "@/db";
import { kitTemplates, kitTemplateItems, items } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { KitsClient, type TemplateForDisplay } from "@/components/kits/KitsClient";

export const dynamic = "force-dynamic";

export default async function KitsPage() {
  const [templates, ingredientRows, allItems] = await Promise.all([
    db.select().from(kitTemplates).orderBy(asc(kitTemplates.name)),
    db
      .select({
        kitTemplateId: kitTemplateItems.kitTemplateId,
        itemId: kitTemplateItems.itemId,
        quantityPerKit: kitTemplateItems.quantityPerKit,
        itemName: items.name,
        unit: items.unit,
        currentQuantity: items.quantity,
      })
      .from(kitTemplateItems)
      .innerJoin(items, eq(kitTemplateItems.itemId, items.id)),
    db.select({ id: items.id, name: items.name, unit: items.unit }).from(items).orderBy(asc(items.name)),
  ]);

  const templatesForDisplay: TemplateForDisplay[] = templates.map((t) => {
    const ingredients = ingredientRows
      .filter((r) => r.kitTemplateId === t.id)
      .map((r) => ({
        itemId: r.itemId,
        itemName: r.itemName,
        unit: r.unit,
        quantityPerKit: r.quantityPerKit,
        currentQuantity: r.currentQuantity,
      }));

    const buildableCount =
      ingredients.length === 0
        ? 0
        : Math.min(
            ...ingredients.map((ing) =>
              Math.floor(ing.currentQuantity / ing.quantityPerKit)
            )
          );

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      ingredients,
      buildableCount,
    };
  });

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
          Care Kit Builder
        </p>
        <h1 className="font-display text-3xl text-ink">
          What we can assemble right now
        </h1>
      </header>

      <KitsClient templates={templatesForDisplay} catalogItems={allItems} />
    </div>
  );
}
