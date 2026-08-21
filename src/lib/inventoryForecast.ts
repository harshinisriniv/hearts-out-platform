import { db } from "@/db";
import { items, inventoryTransactions } from "@/db/schema";
import { eq, gte, and, lt } from "drizzle-orm";

export type ForecastItem = {
  itemName: string;
  quantity: number;
  unit: string;
  dailyRate: number;
  daysUntilEmpty: number;
};

// Projects days-until-empty from recent consumption; no trend, no forecast
export async function getInventoryForecast(lookbackDays = 30): Promise<ForecastItem[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const allItems = await db.select().from(items);
  const consumptionRows = await db
    .select()
    .from(inventoryTransactions)
    .where(
      and(
        gte(inventoryTransactions.createdAt, cutoff),
        lt(inventoryTransactions.delta, 0) // only actual consumption, not restocking
      )
    );

  // Stay quiet below these — not enough signal for a real projection
  const MIN_UNITS_CONSUMED = 3;
  const MAX_MEANINGFUL_DAYS = 90;

  const forecasts: ForecastItem[] = [];

  for (const item of allItems) {
    const consumed = consumptionRows
      .filter((r) => r.itemId === item.id)
      .reduce((sum, r) => sum + Math.abs(r.delta), 0);

    if (consumed < MIN_UNITS_CONSUMED || item.quantity === 0) continue;

    const dailyRate = consumed / lookbackDays;
    const daysUntilEmpty = Math.round(item.quantity / dailyRate);

    if (daysUntilEmpty > MAX_MEANINGFUL_DAYS) continue;

    forecasts.push({
      itemName: item.name,
      quantity: item.quantity,
      unit: item.unit,
      dailyRate,
      daysUntilEmpty,
    });
  }

  return forecasts.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
}
