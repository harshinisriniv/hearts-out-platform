import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  numeric,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------- INVENTORY ----------

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g. "Toothbrush"
  category: text("category").notNull(), // e.g. "Hygiene", "Clothing"
  unit: text("unit").notNull().default("each"), // each, pack, pair, etc.
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Every inventory change is logged here (scan, manual, kit build, distribution)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(), // +N or -N
  reason: text("reason").notNull(), // "scan", "manual", "kit_build", "distribution", "correction"
  sourceId: integer("source_id"), // links to scanLog.id or kitBuild.id or distribution.id when relevant
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Record of every CV scan performed, for audit/undo purposes
export const scanLogs = pgTable("scan_logs", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url"), // stored image reference (blob URL)
  rawResponse: jsonb("raw_response"), // full parsed AI response
  itemsDetected: jsonb("items_detected"), // [{itemName, quantity, confidence}]
  status: text("status").notNull().default("pending"), // pending, confirmed, rejected
  scanType: text("scan_type").notNull().default("single"), // "single" or "batch" (whole box/table)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- CARE KIT BUILDER ----------

export const kitTemplates = pgTable("kit_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Standard Care Kit"
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kitTemplateItems = pgTable("kit_template_items", {
  id: serial("id").primaryKey(),
  kitTemplateId: integer("kit_template_id")
    .notNull()
    .references(() => kitTemplates.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  quantityPerKit: integer("quantity_per_kit").notNull().default(1),
});

// A logged "build" event — assembling N kits, deducting inventory accordingly
export const kitBuilds = pgTable("kit_builds", {
  id: serial("id").primaryKey(),
  kitTemplateId: integer("kit_template_id")
    .notNull()
    .references(() => kitTemplates.id),
  quantityBuilt: integer("quantity_built").notNull(),
  builtBy: text("built_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- PANTRY & SHELTER (PARTNERS) ----------

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "pantry" | "shelter" | "outreach"
  address: text("address"),
  primaryContactName: text("primary_contact_name"),
  primaryContactPhone: text("primary_contact_phone"),
  primaryContactEmail: text("primary_contact_email"),
  preferredKitTemplateId: integer("preferred_kit_template_id").references(
    () => kitTemplates.id
  ),
  typicalKitsRequested: integer("typical_kits_requested"),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const distributions = pgTable("distributions", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  kitTemplateId: integer("kit_template_id").references(() => kitTemplates.id),
  kitCount: integer("kit_count").notNull(),
  distributedAt: timestamp("distributed_at").notNull().defaultNow(), // scheduled date/time
  assignedVolunteerId: integer("assigned_volunteer_id").references(() => volunteers.id, {
    onDelete: "set null",
  }),
  isDelivered: boolean("is_delivered").notNull().default(false),
  deliveredAt: timestamp("delivered_at"),
  reminderSentAt: timestamp("reminder_sent_at"), // when the 24h-before reminder was sent
  notes: text("notes"),
});

// ---------- FUNDRAISING & DONATIONS ----------

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("fundraiser"), // "fundraiser" | "restaurant_night" | "other"
  eventDate: timestamp("event_date").notNull(),
  location: text("location"),
  goalAmount: numeric("goal_amount", { precision: 10, scale: 2 }),
  amountRaised: numeric("amount_raised", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  attendeeCount: integer("attendee_count"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const donors = pgTable("donors", {
  id: serial("id").primaryKey(),
  name: text("name"), // nullable to support anonymous
  donorType: text("donor_type").notNull().default("individual"), // "individual" | "company"
  email: text("email"),
  phone: text("phone"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  donorId: integer("donor_id").references(() => donors.id, {
    onDelete: "set null",
  }),
  eventId: integer("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(), // "cash" | "check" | "online" | "item"
  amount: numeric("amount", { precision: 10, scale: 2 }), // null if item donation
  itemDescription: text("item_description"), // free-text notes for anything not itemized below
  donatedAt: timestamp("donated_at").notNull().defaultNow(),
  notes: text("notes"),
});

// Item donations, itemized — flows into inventory like a purchase or scan
export const donationLineItems = pgTable("donation_line_items", {
  id: serial("id").primaryKey(),
  donationId: integer("donation_id")
    .notNull()
    .references(() => donations.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  quantityDonated: integer("quantity_donated").notNull(),
});

// ---------- VOLUNTEERS (lightweight, feeds impact dashboard count) ----------

// ---------- PURCHASES (BUDGET TOOL) ----------
// Spending tracker — line items add straight back into inventory

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(), // e.g. "Costco run for pads/wipes"
  category: text("category").notNull().default("Inventory"), // "Inventory" | "Venue" | "Marketing" | "Supplies" | "Other"
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  notes: text("notes"),
  receiptImage: text("receipt_image"), // base64 data URL, kept small/compressed client-side
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseLineItems = pgTable("purchase_line_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  quantityPurchased: integer("quantity_purchased").notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }),
});

// ---------- ORG SETTINGS ----------
// Single-row table for small configurable values

export const orgSettings = pgTable("org_settings", {
  id: serial("id").primaryKey(),
  lowBalanceThreshold: numeric("low_balance_threshold", { precision: 10, scale: 2 })
    .notNull()
    .default("200"),
});

// ---------- TASKS ----------
// Kept separate from calendarItems so tasks can carry an assignee + status

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("todo"), // "todo" | "done"
  notifiedAt: timestamp("notified_at"), // when assignment notifications were last sent
  reminderSentAt: timestamp("reminder_sent_at"), // when the 24h-before reminder was sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Many-to-many: a task can have multiple assignees
export const taskAssignees = pgTable("task_assignees", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  volunteerId: integer("volunteer_id")
    .notNull()
    .references(() => volunteers.id, { onDelete: "cascade" }),
});

// ---------- CALENDAR ----------
// Unified calendar table; some rows reference other records, some are standalone tasks

export const calendarItems = pgTable("calendar_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // "event" | "volunteer_day" | "pickup" | "distribution" | "follow_up" | "task" | "deadline"
  date: timestamp("date").notNull(),
  linkedPartnerId: integer("linked_partner_id").references(() => partners.id),
  linkedEventId: integer("linked_event_id").references(() => events.id),
  isDone: boolean("is_done").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
