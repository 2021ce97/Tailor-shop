import { pgTable, bigserial, bigint, boolean, date, integer, jsonb, numeric, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches, users } from "./schema-core";
import { tailorOrders } from "./schema-tailoring";
import { transactions } from "./schema-sales";

export const garmentTypes = pgTable("garment_types", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameFa: varchar("name_fa", { length: 120 }).notNull(),
  namePs: varchar("name_ps", { length: 120 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const garmentMeasurementFields = pgTable("garment_measurement_fields", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  garmentTypeId: bigint("garment_type_id", { mode: "number" }).notNull().references(() => garmentTypes.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 60 }).notNull(),
  labelFa: varchar("label_fa", { length: 120 }).notNull(),
  labelPs: varchar("label_ps", { length: 120 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("inch"),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const garmentDesignCategories = pgTable("garment_design_categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  garmentTypeId: bigint("garment_type_id", { mode: "number" }).notNull().references(() => garmentTypes.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 60 }).notNull(),
  labelFa: varchar("label_fa", { length: 120 }).notNull(),
  labelPs: varchar("label_ps", { length: 120 }).notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const garmentDesignOptions = pgTable("garment_design_options", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  categoryId: bigint("category_id", { mode: "number" }).notNull().references(() => garmentDesignCategories.id, { onDelete: "cascade" }),
  labelFa: varchar("label_fa", { length: 120 }).notNull(),
  labelPs: varchar("label_ps", { length: 120 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const businessContacts = pgTable("business_contacts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  contactCode: varchar("contact_code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  roles: jsonb("roles").notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tailorOrderItems = pgTable("tailor_order_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tailorOrderId: bigint("tailor_order_id", { mode: "number" }).notNull().references(() => tailorOrders.id, { onDelete: "cascade" }),
  garmentTypeId: bigint("garment_type_id", { mode: "number" }).references(() => garmentTypes.id),
  garmentTypeSnapshot: jsonb("garment_type_snapshot").notNull().default({}),
  ticketNo: varchar("ticket_no", { length: 60 }).notNull().unique(),
  measurementSnapshot: jsonb("measurement_snapshot").notNull().default({}),
  designSnapshot: jsonb("design_snapshot").notNull().default({}),
  currentStage: varchar("current_stage", { length: 30 }).notNull().default("measurement"),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  itemAmount: numeric("item_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storageLocations = pgTable("storage_locations", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  code: varchar("code", { length: 20 }).notNull(),
  capacityGarments: integer("capacity_garments").notNull().default(20),
  capacityOrders: integer("capacity_orders").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const garmentStorageAssignments = pgTable("garment_storage_assignments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  garmentItemId: bigint("garment_item_id", { mode: "number" }).notNull().references(() => tailorOrderItems.id, { onDelete: "cascade" }),
  storageLocationId: bigint("storage_location_id", { mode: "number" }).notNull().references(() => storageLocations.id),
  storedAt: timestamp("stored_at", { withTimezone: true }).notNull().defaultNow(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  storedBy: bigint("stored_by", { mode: "number" }).references(() => users.id),
});

export const workerAssignments = pgTable("worker_assignments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  garmentItemId: bigint("garment_item_id", { mode: "number" }).notNull().references(() => tailorOrderItems.id, { onDelete: "cascade" }),
  businessContactId: bigint("business_contact_id", { mode: "number" }).notNull().references(() => businessContacts.id),
  workType: varchar("work_type", { length: 20 }).notNull(),
  agreedRate: numeric("agreed_rate", { precision: 12, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 20 }).notNull().default("assigned"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
});

export const contactAccountEntries = pgTable("contact_account_entries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  businessContactId: bigint("business_contact_id", { mode: "number" }).notNull().references(() => businessContacts.id, { onDelete: "cascade" }),
  transactionId: bigint("transaction_id", { mode: "number" }).references(() => transactions.id),
  entryType: varchar("entry_type", { length: 40 }).notNull(),
  debitAmount: numeric("debit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  creditAmount: numeric("credit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  entryDate: date("entry_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
