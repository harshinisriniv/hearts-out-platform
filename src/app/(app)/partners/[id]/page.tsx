import { db } from "@/db";
import { partners, distributions, kitTemplates, volunteers } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PartnerDashboardClient, type DeliveryRow } from "@/components/partners/PartnerDashboardClient";

export const dynamic = "force-dynamic";

function toDateTimeInputValue(date: Date): string {
  return date.toISOString();
}

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partnerId = Number(id);

  const [[partner], deliveryRows, kitTemplateOptions, volunteerOptions] = await Promise.all([
    db.select().from(partners).where(eq(partners.id, partnerId)),
    db
      .select({
        id: distributions.id,
        kitTemplateId: distributions.kitTemplateId,
        kitTemplateName: kitTemplates.name,
        kitCount: distributions.kitCount,
        distributedAt: distributions.distributedAt,
        assignedVolunteerId: distributions.assignedVolunteerId,
        volunteerName: volunteers.name,
        isDelivered: distributions.isDelivered,
        deliveredAt: distributions.deliveredAt,
        notes: distributions.notes,
      })
      .from(distributions)
      .leftJoin(kitTemplates, eq(distributions.kitTemplateId, kitTemplates.id))
      .leftJoin(volunteers, eq(distributions.assignedVolunteerId, volunteers.id))
      .where(eq(distributions.partnerId, partnerId))
      .orderBy(desc(distributions.distributedAt)),
    db.select({ id: kitTemplates.id, name: kitTemplates.name }).from(kitTemplates).orderBy(asc(kitTemplates.name)),
    db.select({ id: volunteers.id, name: volunteers.name }).from(volunteers).orderBy(asc(volunteers.name)),
  ]);

  if (!partner) notFound();

  const deliveries: DeliveryRow[] = deliveryRows.map((d) => ({
    id: d.id,
    kitTemplateName: d.kitTemplateName,
    kitCount: d.kitCount,
    distributedAt: toDateTimeInputValue(d.distributedAt),
    volunteerName: d.volunteerName,
    isDelivered: d.isDelivered,
    deliveredAt: d.deliveredAt ? toDateTimeInputValue(d.deliveredAt) : null,
    notes: d.notes,
  }));

  const totalKitsDelivered = deliveries
    .filter((d) => d.isDelivered)
    .reduce((sum, d) => sum + d.kitCount, 0);
  const upcomingCount = deliveries.filter((d) => !d.isDelivered).length;
  const lastDelivered = deliveries
    .filter((d) => d.isDelivered && d.deliveredAt)
    .sort((a, b) => (b.deliveredAt! > a.deliveredAt! ? 1 : -1))[0];

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href="/partners"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all partners
      </Link>

      <header className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-ink-soft mb-1 capitalize">
          {partner.type}
        </p>
        <h1 className="font-display text-3xl text-ink">{partner.name}</h1>
        {partner.address && <p className="text-sm text-ink-soft mt-1">{partner.address}</p>}
        {partner.primaryContactName && (
          <p className="text-sm text-ink-soft mt-1">
            {partner.primaryContactName}
            {partner.primaryContactPhone ? ` · ${partner.primaryContactPhone}` : ""}
            {partner.primaryContactEmail ? ` · ${partner.primaryContactEmail}` : ""}
          </p>
        )}
      </header>

      <PartnerDashboardClient
        partnerId={partner.id}
        partnerName={partner.name}
        deliveries={deliveries}
        kitTemplateOptions={kitTemplateOptions}
        volunteerOptions={volunteerOptions}
        totalKitsDelivered={totalKitsDelivered}
        upcomingCount={upcomingCount}
        lastDeliveredAt={lastDelivered?.deliveredAt ?? null}
      />
    </div>
  );
}
