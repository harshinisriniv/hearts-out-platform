import { db } from "@/db";
import { partners, distributions, kitTemplates } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { PartnersClient, type PartnerRow } from "@/components/partners/PartnersClient";

export const dynamic = "force-dynamic";

function toDateInputValue(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export default async function PartnersPage() {
  const [allPartners, allDistributions, allKitTemplates] = await Promise.all([
    db.select().from(partners).orderBy(asc(partners.name)),
    db
      .select({
        id: distributions.id,
        partnerId: distributions.partnerId,
        kitCount: distributions.kitCount,
        distributedAt: distributions.distributedAt,
        isDelivered: distributions.isDelivered,
        deliveredAt: distributions.deliveredAt,
      })
      .from(distributions)
      .orderBy(desc(distributions.distributedAt)),
    db.select({ id: kitTemplates.id, name: kitTemplates.name }).from(kitTemplates).orderBy(asc(kitTemplates.name)),
  ]);

  const partnerRows: PartnerRow[] = allPartners.map((p) => {
    const delivered = allDistributions.filter((d) => d.partnerId === p.id && d.isDelivered);
    const upcoming = allDistributions.filter((d) => d.partnerId === p.id && !d.isDelivered);
    const totalKitsReceived = delivered.reduce((sum, d) => sum + d.kitCount, 0);
    const lastDistributionAt = delivered[0] ? toDateInputValue(delivered[0].deliveredAt) : null;

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      address: p.address,
      primaryContactName: p.primaryContactName,
      primaryContactPhone: p.primaryContactPhone,
      primaryContactEmail: p.primaryContactEmail,
      preferredKitTemplateId: p.preferredKitTemplateId,
      typicalKitsRequested: p.typicalKitsRequested,
      notes: p.notes,
      nextFollowUpAt: toDateInputValue(p.nextFollowUpAt),
      totalKitsReceived,
      lastDistributionAt,
      upcomingCount: upcoming.length,
    };
  });

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
          Pantries & Shelters
        </p>
        <h1 className="font-display text-3xl text-ink">Who we work with</h1>
      </header>

      <PartnersClient partners={partnerRows} kitTemplateOptions={allKitTemplates} />
    </div>
  );
}
