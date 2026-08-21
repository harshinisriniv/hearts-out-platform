"use server";

import { db } from "@/db";
import { events, donations, distributions, partners, purchases, kitBuilds, donationLineItems, items } from "@/db/schema";
import { and, gte, lte, isNull, eq } from "drizzle-orm";
import { anthropic, TEXT_MODEL } from "@/lib/anthropic";

export async function generateImpactReport(input: {
  startDate: string;
  endDate: string;
  label: string; // e.g. "This Quarter", "This Year"
}): Promise<string> {
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  const [
    eventRows,
    unlinkedDonations,
    deliveredKits,
    newPartners,
    purchaseRows,
    kitsBuiltRows,
    itemDonationRows,
  ] = await Promise.all([
    db.select().from(events).where(and(gte(events.eventDate, start), lte(events.eventDate, end))),
    db
      .select()
      .from(donations)
      .where(and(isNull(donations.eventId), gte(donations.donatedAt, start), lte(donations.donatedAt, end))),
    db
      .select()
      .from(distributions)
      .where(
        and(
          eq(distributions.isDelivered, true),
          gte(distributions.deliveredAt, start),
          lte(distributions.deliveredAt, end)
        )
      ),
    db.select().from(partners).where(and(gte(partners.createdAt, start), lte(partners.createdAt, end))),
    db.select().from(purchases).where(and(gte(purchases.purchasedAt, start), lte(purchases.purchasedAt, end))),
    db.select().from(kitBuilds).where(and(gte(kitBuilds.createdAt, start), lte(kitBuilds.createdAt, end))),
    db
      .select({ itemName: items.name, quantityDonated: donationLineItems.quantityDonated })
      .from(donationLineItems)
      .innerJoin(donations, eq(donationLineItems.donationId, donations.id))
      .innerJoin(items, eq(donationLineItems.itemId, items.id))
      .where(and(gte(donations.donatedAt, start), lte(donations.donatedAt, end))),
  ]);

  const totalRaised =
    eventRows.reduce((sum, e) => sum + Number(e.amountRaised), 0) +
    unlinkedDonations.reduce((sum, d) => sum + (d.amount ? Number(d.amount) : 0), 0);
  const totalSpent = purchaseRows.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const kitsDistributed = deliveredKits.reduce((sum, d) => sum + d.kitCount, 0);
  const kitsBuilt = kitsBuiltRows.reduce((sum, k) => sum + k.quantityBuilt, 0);
  const restaurantNights = eventRows.filter((e) => e.type === "restaurant_night").length;
  const fundraiserEvents = eventRows.filter((e) => e.type === "fundraiser").length;

  const itemTotals = new Map<string, number>();
  for (const li of itemDonationRows) {
    itemTotals.set(li.itemName, (itemTotals.get(li.itemName) ?? 0) + li.quantityDonated);
  }

  const statsSummary = {
    period: input.label,
    dateRange: `${input.startDate} to ${input.endDate}`,
    totalRaised,
    totalSpent,
    kitsDistributed,
    kitsBuilt,
    newPartnerOrganizations: newPartners.length,
    fundraiserEvents,
    restaurantNights,
    itemDonations: Array.from(itemTotals.entries()).map(([name, qty]) => `${qty} ${name}`),
  };

  const response = await anthropic.messages.create({
    model: TEXT_MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `Write a short impact report for Hearts Out for Homeless, a small volunteer-run nonprofit that supplies hygiene care kits to local pantries and shelters. This report covers: ${input.label} (${input.startDate} to ${input.endDate}).

Here is the real data for this period — use only these numbers, don't invent anything:
${JSON.stringify(statsSummary, null, 2)}

Write 2-4 warm, genuine paragraphs suitable for a board update, newsletter, or grant application. Lead with the headline impact (kits distributed), then cover fundraising and how it was raised, then close with growth (new partners, item donations) if there's anything notable. If a number is zero or there's nothing to report in a category, just skip it gracefully rather than mentioning the absence. Keep it grounded and specific with real numbers, not generic nonprofit-speak. No markdown headers, just prose paragraphs.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "Couldn't generate a report right now.";
}
