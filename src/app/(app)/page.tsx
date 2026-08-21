import { db } from "@/db";
import { partners, donations, events, distributions } from "@/db/schema";
import { sql, isNull } from "drizzle-orm";
import { Heart, Home, DollarSign, TrendingUp } from "lucide-react";
import { getCalendarEntries } from "@/lib/getCalendarEntries";
import { getInventoryForecast } from "@/lib/inventoryForecast";
import { DashboardAgenda } from "@/components/dashboard/DashboardAgenda";
import { AskAssistant } from "@/components/dashboard/AskAssistant";
import { InventoryForecastCard } from "@/components/dashboard/InventoryForecastCard";
import { ImpactReportGenerator } from "@/components/dashboard/ImpactReportGenerator";
import { PageHero } from "@/components/PageHero";

// Always fresh — no caching
export const dynamic = "force-dynamic";

async function getStats() {
  const [partnersResult, eventRaisedResult, unlinkedDonationsResult, kitsDistributedResult] =
    await Promise.all([
      db.select({ total: sql<number>`count(*)` }).from(partners),
      db.select({ total: sql<number>`coalesce(sum(${events.amountRaised}), 0)` }).from(events),
      // Skip donations already counted via their event's amountRaised
      db
        .select({ total: sql<number>`coalesce(sum(${donations.amount}), 0)` })
        .from(donations)
        .where(isNull(donations.eventId)),
      db
        .select({ total: sql<number>`coalesce(sum(${distributions.kitCount}), 0)` })
        .from(distributions)
        .where(sql`${distributions.isDelivered} = true`),
    ]);

  return {
    partnerCount: Number(partnersResult[0]?.total ?? 0),
    amountRaised: Number(eventRaisedResult[0]?.total ?? 0) + Number(unlinkedDonationsResult[0]?.total ?? 0),
    kitsDistributed: Number(kitsDistributedResult[0]?.total ?? 0),
  };
}

const STAT_CARDS = [
  { key: "kitsDistributed", label: "Care kits distributed", icon: Heart, tone: "brick" as const },
  { key: "partnerCount", label: "Partner organizations", icon: Home, tone: "ochre" as const },
  { key: "amountRaised", label: "Total fundraised", icon: DollarSign, tone: "sage" as const, isCurrency: true },
];

const TONE_STYLES: Record<
  "brick" | "sage" | "ochre",
  { badgeBg: string; badgeText: string; borderTopColor: string }
> = {
  brick: { badgeBg: "bg-brick-soft", badgeText: "text-brick-dark", borderTopColor: "var(--brick)" },
  ochre: { badgeBg: "bg-ochre-soft", badgeText: "text-ochre-dark", borderTopColor: "var(--ochre)" },
  sage: { badgeBg: "bg-sage-soft", badgeText: "text-sage-dark", borderTopColor: "var(--sage)" },
};

export default async function DashboardPage() {
  const [stats, calendarEntries, forecast] = await Promise.all([
    getStats(),
    getCalendarEntries(),
    getInventoryForecast(),
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <PageHero
        eyebrow="Impact Dashboard"
        title="What Hearts Out for Homeless has done so far"
        tone="brick"
        tagline="every kit counts ♥"
        chip={
          <div className="inline-flex items-center gap-2 bg-paper-raised border-2 border-ink rounded-2xl px-4 py-2.5">
            <TrendingUp className="w-4 h-4 text-brick" />
            <span className="font-mono font-bold text-sm text-ink">
              {stats.kitsDistributed.toLocaleString()} kits and counting
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {STAT_CARDS.map(({ key, label, icon: Icon, tone, isCurrency }) => {
          const value = stats[key as keyof typeof stats];
          const { badgeBg, badgeText, borderTopColor } = TONE_STYLES[tone];
          return (
            <div
              key={key}
              className="pop-card bg-paper-raised rounded-2xl p-5"
              style={{ borderTopWidth: 4, borderTopColor }}
            >
              <div className={`w-9 h-9 rounded-xl ${badgeBg} border-2 border-ink flex items-center justify-center mb-4`}>
                <Icon className={`w-[19px] h-[19px] ${badgeText}`} />
              </div>
              <p className="font-mono text-[30px] text-ink tabular">
                {isCurrency ? `$${value.toLocaleString()}` : value.toLocaleString()}
              </p>
              <p className="text-sm text-ink-soft mt-1.5 font-semibold">{label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <AskAssistant />
        <DashboardAgenda entries={calendarEntries} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InventoryForecastCard forecast={forecast} />
        <ImpactReportGenerator />
      </div>
    </div>
  );
}
