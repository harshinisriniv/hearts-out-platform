import { db } from "@/db";
import { purchases } from "@/db/schema";
import { NextResponse } from "next/server";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const rows = await db.select().from(purchases);

  const header = ["Date", "Description", "Category", "Total Amount", "Notes"];

  const lines = rows.map((r) =>
    [
      r.purchasedAt.toISOString().slice(0, 10),
      r.description,
      r.category,
      r.totalAmount,
      r.notes ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="purchases.csv"`,
    },
  });
}
