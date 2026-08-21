import Link from "next/link";
import { TrendingDown, ArrowRight } from "lucide-react";
import type { ForecastItem } from "@/lib/inventoryForecast";

function urgencyClass(days: number): { tag: string; text: string } {
  if (days <= 7) return { tag: "hang-tag--brick", text: "text-brick" };
  if (days <= 14) return { tag: "hang-tag--ochre", text: "text-ochre" };
  return { tag: "hang-tag--sage", text: "text-sage" };
}

// Placeholder data shown only until there's real usage history
const MOCK_FORECAST: ForecastItem[] = [
  { itemName: "Tampons", quantity: 18, unit: "each", dailyRate: 3, daysUntilEmpty: 6 },
  { itemName: "Toothpaste", quantity: 42, unit: "each", dailyRate: 2, daysUntilEmpty: 17 },
  { itemName: "Bandages", quantity: 96, unit: "each", dailyRate: 4, daysUntilEmpty: 25 },
];

export function InventoryForecastCard({ forecast }: { forecast: ForecastItem[] }) {
  const isMock = forecast.length === 0;
  const topConcerns = (isMock ? MOCK_FORECAST : forecast).slice(0, 5);

  return (
    <div className="pop-card bg-paper-raised rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-lg text-ink flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-brick" />
          Running low soon
        </h3>
        <Link
          href="/inventory"
          className="text-xs text-brick hover:text-brick-dark font-medium flex items-center gap-1"
        >
          Inventory
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <ul className="space-y-2 mt-3">
        {topConcerns.map((f) => {
          const { tag, text } = urgencyClass(f.daysUntilEmpty);
          return (
            <li key={f.itemName} className={`hang-tag ${tag} p-2.5 flex items-center justify-between`}>
              <div>
                <p className="text-sm text-ink font-medium">{f.itemName}</p>
                <p className="text-xs text-ink-soft">
                  {f.quantity} {f.unit} left · using ~{Math.max(1, Math.round(f.dailyRate))}/day
                </p>
              </div>
              <span className={`font-mono tabular text-sm ${text} whitespace-nowrap`}>
                ~{f.daysUntilEmpty}d left
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
