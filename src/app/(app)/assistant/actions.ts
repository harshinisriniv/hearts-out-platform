"use server";

import { db } from "@/db";
import {
  events,
  donations,
  donors,
  distributions,
  partners,
  items,
  purchases,
  tasks,
  taskAssignees,
  volunteers,
} from "@/db/schema";
import { and, eq, gte, lte, ilike, isNull, sql } from "drizzle-orm";
import { anthropic, TEXT_MODEL } from "@/lib/anthropic";
import { getCalendarEntries } from "@/lib/getCalendarEntries";
import type Anthropic from "@anthropic-ai/sdk";

// ---------- Pre-built query "tools" ----------
// Fixed set the assistant picks from — no raw SQL, no injection risk.

async function getTotalRaised(input: { startDate?: string; endDate?: string }) {
  const start = input.startDate ? new Date(input.startDate) : null;
  const end = input.endDate ? new Date(input.endDate) : null;

  const eventConditions = [];
  if (start) eventConditions.push(gte(events.eventDate, start));
  if (end) eventConditions.push(lte(events.eventDate, end));
  const eventRows = await db.select().from(events).where(eventConditions.length ? and(...eventConditions) : undefined);

  const donationConditions = [isNull(donations.eventId)];
  if (start) donationConditions.push(gte(donations.donatedAt, start));
  if (end) donationConditions.push(lte(donations.donatedAt, end));
  const donationRows = await db.select().from(donations).where(and(...donationConditions));

  const eventTotal = eventRows.reduce((sum, e) => sum + Number(e.amountRaised), 0);
  const donationTotal = donationRows.reduce((sum, d) => sum + (d.amount ? Number(d.amount) : 0), 0);

  return { totalRaised: eventTotal + donationTotal, eventCount: eventRows.length, donationCount: donationRows.length };
}

async function getKitsDistributed(input: { startDate?: string; endDate?: string; partnerName?: string }) {
  const conditions = [eq(distributions.isDelivered, true)];
  if (input.startDate) conditions.push(gte(distributions.deliveredAt, new Date(input.startDate)));
  if (input.endDate) conditions.push(lte(distributions.deliveredAt, new Date(input.endDate)));

  let query = db
    .select({ kitCount: distributions.kitCount, partnerName: partners.name })
    .from(distributions)
    .innerJoin(partners, eq(distributions.partnerId, partners.id))
    .where(and(...conditions));

  const rows = await query;
  const filtered = input.partnerName
    ? rows.filter((r) => r.partnerName.toLowerCase().includes(input.partnerName!.toLowerCase()))
    : rows;

  return { totalKits: filtered.reduce((sum, r) => sum + r.kitCount, 0), deliveryCount: filtered.length };
}

async function getTopDonors(input: { limit?: number }) {
  const rows = await db.select().from(donations).where(sql`${donations.amount} is not null`);
  const totals = new Map<number, number>();
  for (const d of rows) {
    if (!d.donorId) continue;
    totals.set(d.donorId, (totals.get(d.donorId) ?? 0) + Number(d.amount));
  }
  const donorRows = await db.select().from(donors);
  const donorById = new Map(donorRows.map((d) => [d.id, d]));

  const ranked = Array.from(totals.entries())
    .map(([donorId, total]) => {
      const donor = donorById.get(donorId);
      return {
        name: donor?.isAnonymous ? "Anonymous donor" : donor?.name ?? "Unknown",
        totalGiven: total,
      };
    })
    .sort((a, b) => b.totalGiven - a.totalGiven)
    .slice(0, input.limit ?? 5);

  return { topDonors: ranked };
}

async function getPartnerSummary(input: { partnerName: string }) {
  const [partner] = await db.select().from(partners).where(ilike(partners.name, `%${input.partnerName}%`));
  if (!partner) return { error: `No partner found matching "${input.partnerName}"` };

  const deliveries = await db.select().from(distributions).where(eq(distributions.partnerId, partner.id));
  const delivered = deliveries.filter((d) => d.isDelivered);

  return {
    name: partner.name,
    type: partner.type,
    totalKitsReceived: delivered.reduce((sum, d) => sum + d.kitCount, 0),
    upcomingDeliveries: deliveries.filter((d) => !d.isDelivered).length,
    nextFollowUp: partner.nextFollowUpAt?.toISOString().slice(0, 10) ?? null,
  };
}

async function getInventoryLevel(input: { itemName: string }) {
  const matches = await db.select().from(items).where(ilike(items.name, `%${input.itemName}%`));
  if (matches.length === 0) return { error: `No item found matching "${input.itemName}"` };

  return {
    items: matches.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      isLowStock: i.quantity <= i.lowStockThreshold,
    })),
  };
}

async function getLowStockItems() {
  const allItems = await db.select().from(items);
  const low = allItems.filter((i) => i.quantity <= i.lowStockThreshold);
  return { lowStockItems: low.map((i) => ({ name: i.name, quantity: i.quantity, threshold: i.lowStockThreshold })) };
}

async function getUpcomingItems(input: { days?: number }) {
  const days = input.days ?? 14;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const entries = await getCalendarEntries();
  const upcoming = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= new Date(new Date().toDateString()) && d <= cutoff;
  });
  return {
    upcoming: upcoming.map((e) => ({ title: e.title, date: e.date.slice(0, 10), type: e.type, isDone: e.isDone })),
  };
}

async function getTotalSpent(input: { startDate?: string; endDate?: string }) {
  const conditions = [];
  if (input.startDate) conditions.push(gte(purchases.purchasedAt, new Date(input.startDate)));
  if (input.endDate) conditions.push(lte(purchases.purchasedAt, new Date(input.endDate)));
  const rows = await db.select().from(purchases).where(conditions.length ? and(...conditions) : undefined);
  return { totalSpent: rows.reduce((sum, p) => sum + Number(p.totalAmount), 0), purchaseCount: rows.length };
}

async function getVolunteerWorkload(input: { volunteerName: string }) {
  const [volunteer] = await db.select().from(volunteers).where(ilike(volunteers.name, `%${input.volunteerName}%`));
  if (!volunteer) return { error: `No volunteer found matching "${input.volunteerName}"` };

  const assignments = await db
    .select({ taskId: taskAssignees.taskId })
    .from(taskAssignees)
    .where(eq(taskAssignees.volunteerId, volunteer.id));
  const taskRows = await db.select().from(tasks).where(sql`${tasks.status} = 'todo'`);
  const openTasks = taskRows.filter((t) => assignments.some((a) => a.taskId === t.id));

  const deliveries = await db
    .select()
    .from(distributions)
    .where(and(eq(distributions.assignedVolunteerId, volunteer.id), eq(distributions.isDelivered, false)));

  return {
    name: volunteer.name,
    openTaskCount: openTasks.length,
    openTaskTitles: openTasks.map((t) => t.title),
    upcomingDeliveryCount: deliveries.length,
  };
}

const TOOL_EXECUTORS: Record<string, (input: any) => Promise<unknown>> = {
  get_total_raised: getTotalRaised,
  get_kits_distributed: getKitsDistributed,
  get_top_donors: getTopDonors,
  get_partner_summary: getPartnerSummary,
  get_inventory_level: getInventoryLevel,
  get_low_stock_items: getLowStockItems,
  get_upcoming_items: getUpcomingItems,
  get_total_spent: getTotalSpent,
  get_volunteer_workload: getVolunteerWorkload,
};

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_total_raised",
    description: "Total money raised from events, restaurant nights, and monetary donations, optionally within a date range.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "ISO date, optional" },
        endDate: { type: "string", description: "ISO date, optional" },
      },
    },
  },
  {
    name: "get_kits_distributed",
    description: "Total care kits actually delivered, optionally filtered by date range or partner organization name.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string" },
        endDate: { type: "string" },
        partnerName: { type: "string", description: "Partial name match, optional" },
      },
    },
  },
  {
    name: "get_top_donors",
    description: "Top donors ranked by total monetary giving.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "integer", description: "How many to return, default 5" } },
    },
  },
  {
    name: "get_partner_summary",
    description: "Summary stats for one partner organization by name: kits received, upcoming deliveries, next follow-up.",
    input_schema: {
      type: "object",
      properties: { partnerName: { type: "string" } },
      required: ["partnerName"],
    },
  },
  {
    name: "get_inventory_level",
    description: "Current stock level for an inventory item by name.",
    input_schema: {
      type: "object",
      properties: { itemName: { type: "string" } },
      required: ["itemName"],
    },
  },
  {
    name: "get_low_stock_items",
    description: "Every item currently at or below its low-stock threshold.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_upcoming_items",
    description: "Upcoming tasks, deliveries, events, and follow-ups within the next N days (default 14).",
    input_schema: {
      type: "object",
      properties: { days: { type: "integer" } },
    },
  },
  {
    name: "get_total_spent",
    description: "Total money spent on purchases, optionally within a date range.",
    input_schema: {
      type: "object",
      properties: { startDate: { type: "string" }, endDate: { type: "string" } },
    },
  },
  {
    name: "get_volunteer_workload",
    description: "A volunteer's current open tasks and upcoming deliveries by name.",
    input_schema: {
      type: "object",
      properties: { volunteerName: { type: "string" } },
      required: ["volunteerName"],
    },
  },
];

export async function askAssistant(question: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: TEXT_MODEL,
      max_tokens: 1024,
      system:
        "You are a helpful assistant for Hearts Out for Homeless, a small homeless-services nonprofit. Answer questions about their operations using the provided tools. Be concise and specific with numbers — wrap key figures in **bold** (e.g. **$1,240** or **12 kits**). Use a short bulleted list (lines starting with '- ') when listing multiple items like top donors or upcoming tasks, otherwise write plain sentences. Today's date is " +
        new Date().toISOString().slice(0, 10) +
        ". If a tool returns an error (e.g. no match found), say so plainly rather than guessing.",
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock && textBlock.type === "text" ? textBlock.text : "I couldn't find an answer to that.";
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const executor = TOOL_EXECUTORS[block.name];
        let result: unknown;
        try {
          result = executor ? await executor(block.input) : { error: "Unknown tool" };
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Query failed" };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "Sorry, that question is taking too many steps to answer — try breaking it into something simpler.";
}
