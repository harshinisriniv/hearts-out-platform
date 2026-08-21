import { db } from "@/db";
import { donations, donors, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const rows = await db
    .select({
      id: donations.id,
      donorName: donors.name,
      isAnonymous: donors.isAnonymous,
      eventName: events.name,
      type: donations.type,
      amount: donations.amount,
      itemDescription: donations.itemDescription,
      donatedAt: donations.donatedAt,
      notes: donations.notes,
    })
    .from(donations)
    .leftJoin(donors, eq(donations.donorId, donors.id))
    .leftJoin(events, eq(donations.eventId, events.id));

  const header = [
    "Date",
    "Donor",
    "Event",
    "Type",
    "Amount",
    "Item Description",
    "Notes",
  ];

  const lines = rows.map((r) =>
    [
      r.donatedAt.toISOString().slice(0, 10),
      r.isAnonymous ? "Anonymous" : r.donorName ?? "",
      r.eventName ?? "",
      r.type,
      r.amount ?? "",
      r.itemDescription ?? "",
      r.notes ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="donations.csv"`,
    },
  });
}
