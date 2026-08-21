import { db } from "@/db";
import {
  events,
  donors,
  donations,
  donationLineItems,
  purchases,
  purchaseLineItems,
  items,
  kitBuilds,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { FundraisingClient, type DonorRow, type PurchaseRow, type RestaurantPartnerRow, type CompanyItemDonationRow } from "@/components/fundraising/FundraisingClient";
import { PageHero } from "@/components/PageHero";
import { getOrgSettings } from "@/app/(app)/fundraising/settings-actions";
import type { EditableEvent } from "@/components/fundraising/EventFormModal";
import type { MonthlyPoint, CategoryPoint, EventNetPoint } from "@/components/fundraising/BudgetCharts";

export const dynamic = "force-dynamic";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FundraisingPage() {
  const [
    allEvents,
    allDonors,
    allDonations,
    allDonationLineItems,
    allPurchases,
    allPurchaseLineItems,
    allItems,
    kitBuildRows,
    settings,
  ] = await Promise.all([
    db.select().from(events).orderBy(desc(events.eventDate)),
    db.select().from(donors).orderBy(asc(donors.name)),
    db.select().from(donations),
    db
      .select({
        donationId: donationLineItems.donationId,
        itemId: donationLineItems.itemId,
        itemName: items.name,
        quantityDonated: donationLineItems.quantityDonated,
      })
      .from(donationLineItems)
      .innerJoin(items, eq(donationLineItems.itemId, items.id)),
    db.select().from(purchases).orderBy(desc(purchases.purchasedAt)),
    db
      .select({
        purchaseId: purchaseLineItems.purchaseId,
        itemId: purchaseLineItems.itemId,
        itemName: items.name,
        itemCategory: items.category,
        quantityPurchased: purchaseLineItems.quantityPurchased,
        lineTotal: purchaseLineItems.lineTotal,
      })
      .from(purchaseLineItems)
      .innerJoin(items, eq(purchaseLineItems.itemId, items.id)),
    db.select({ id: items.id, name: items.name, unit: items.unit }).from(items).orderBy(asc(items.name)),
    db.select().from(kitBuilds),
    getOrgSettings(),
  ]);

  // Events, normalized to plain numbers (Postgres numeric columns come back as strings)
  const eventsForDisplay: EditableEvent[] = allEvents.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    eventDate: toDateInputValue(e.eventDate),
    location: e.location,
    goalAmount: e.goalAmount !== null ? Number(e.goalAmount) : null,
    amountRaised: Number(e.amountRaised),
    attendeeCount: e.attendeeCount,
    notes: e.notes,
  }));

  // Donor totals (skip item donations, which have no monetary amount)
  const donationsWithAmount = allDonations.filter((d) => d.amount !== null);
  const donorTotals = new Map<number, number>();
  for (const d of donationsWithAmount) {
    if (!d.donorId) continue;
    donorTotals.set(d.donorId, (donorTotals.get(d.donorId) ?? 0) + Number(d.amount));
  }
  const donorRows: DonorRow[] = allDonors.map((d) => ({
    id: d.id,
    name: d.name,
    donorType: d.donorType,
    email: d.email,
    phone: d.phone,
    isAnonymous: d.isAnonymous,
    notes: d.notes,
    totalGiven: donorTotals.get(d.id) ?? 0,
  }));

  // Any donor with item donations, not just companies
  const itemDonationRows: CompanyItemDonationRow[] = allDonors
    .map((donor) => {
      const theirDonationIds = allDonations
        .filter((d) => d.donorId === donor.id)
        .map((d) => d.id);
      const theirLineItems = allDonationLineItems.filter((li) =>
        theirDonationIds.includes(li.donationId)
      );
      const itemTotals = new Map<string, number>();
      for (const li of theirLineItems) {
        itemTotals.set(li.itemName, (itemTotals.get(li.itemName) ?? 0) + li.quantityDonated);
      }
      return {
        donorId: donor.id,
        name: donor.isAnonymous ? "Anonymous donor" : donor.name ?? "Unnamed donor",
        donorType: donor.donorType,
        items: Array.from(itemTotals.entries()).map(([itemName, totalQuantity]) => ({
          itemName,
          totalQuantity,
        })),
      };
    })
    .filter((d) => d.items.length > 0);

  // Purchases + line items (full detail, needed both for display and edit prefill)
  const purchaseRows: PurchaseRow[] = allPurchases.map((p) => {
    const lines = allPurchaseLineItems.filter((li) => li.purchaseId === p.id);
    const summary = lines.map((li) => `${li.itemName} x${li.quantityPurchased}`).join(", ");
    return {
      id: p.id,
      description: p.description,
      category: p.category,
      totalAmount: Number(p.totalAmount),
      taxAmount: Number(p.taxAmount),
      purchasedAt: toDateInputValue(p.purchasedAt),
      lineItemSummary: summary || "No items recorded",
      receiptImage: p.receiptImage,
      lineItems: lines.map((li) => ({
        itemId: li.itemId,
        itemName: li.itemName,
        category: li.itemCategory,
        quantityPurchased: li.quantityPurchased,
        lineTotal: li.lineTotal !== null ? Number(li.lineTotal) : null,
      })),
    };
  });

  // Budget totals — spending is purchases only now (event expenses removed)
  const donationsNotLinkedToEvent = donationsWithAmount.filter((d) => !d.eventId);
  const totalRaised =
    allEvents.reduce((sum, e) => sum + Number(e.amountRaised), 0) +
    donationsNotLinkedToEvent.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalPurchases = allPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const totalSpent = totalPurchases;
  const netBalance = totalRaised - totalSpent;

  const totalKitsBuilt = kitBuildRows.reduce((sum, k) => sum + k.quantityBuilt, 0);
  const costPerKit = totalKitsBuilt > 0 ? totalPurchases / totalKitsBuilt : null;

  // Monthly chart data
  const monthlyMap = new Map<string, MonthlyPoint>();
  function getMonthBucket(date: Date): MonthlyPoint {
    const key = monthKey(date);
    let bucket = monthlyMap.get(key);
    if (!bucket) {
      bucket = { month: monthLabel(date), raised: 0, spent: 0 };
      monthlyMap.set(key, bucket);
    }
    return bucket;
  }
  for (const e of allEvents) {
    getMonthBucket(e.eventDate).raised += Number(e.amountRaised);
  }
  for (const p of allPurchases) {
    getMonthBucket(p.purchasedAt).spent += Number(p.totalAmount);
  }
  for (const d of donationsNotLinkedToEvent) {
    getMonthBucket(d.donatedAt).raised += Number(d.amount);
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .slice(-9);

  // Category breakdown — purchases only now
  const categoryMap = new Map<string, number>();
  for (const p of allPurchases) {
    categoryMap.set(p.category, (categoryMap.get(p.category) ?? 0) + Number(p.totalAmount));
  }
  const categoryData: CategoryPoint[] = Array.from(categoryMap.entries()).map(
    ([category, amount]) => ({ category, amount })
  );

  // Amount raised by event
  const eventNet: EventNetPoint[] = allEvents
    .filter((e) => Number(e.amountRaised) > 0)
    .map((e) => ({ name: e.name, net: Number(e.amountRaised) }));

  // Restaurant partner grouping (computed from restaurant_night events, no extra table needed)
  const restaurantMap = new Map<string, RestaurantPartnerRow>();
  for (const e of allEvents.filter((e) => e.type === "restaurant_night")) {
    const existing = restaurantMap.get(e.name);
    if (existing) {
      existing.totalRaised += Number(e.amountRaised);
      existing.nightCount += 1;
    } else {
      restaurantMap.set(e.name, { name: e.name, totalRaised: Number(e.amountRaised), nightCount: 1 });
    }
  }
  const restaurantPartners = Array.from(restaurantMap.values()).sort(
    (a, b) => b.totalRaised - a.totalRaised
  );

  return (
    <div className="p-8 max-w-6xl">
      <PageHero eyebrow="Fundraising & Donors" title="Money in, money out" tone="ochre" />

      <FundraisingClient
        events={eventsForDisplay}
        donors={donorRows}
        itemDonations={itemDonationRows}
        purchases={purchaseRows}
        catalogItems={allItems}
        budget={{
          totalRaised,
          totalSpent,
          netBalance,
          costPerKit,
          lowBalanceThreshold: Number(settings.lowBalanceThreshold),
        }}
        monthly={monthly}
        categories={categoryData}
        eventNet={eventNet}
        restaurantPartners={restaurantPartners}
      />
    </div>
  );
}
