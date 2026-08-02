import { pgTable, bigserial, bigint, varchar, text, timestamp, numeric, date, integer } from "drizzle-orm/pg-core";
import { users, customers, suppliers, branches } from "./schema-core";

export const fabrics = pgTable("fabrics", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  name: varchar("name", { length: 150 }).notNull(),
  fabricType: varchar("fabric_type", { length: 50 }),
  color: varchar("color", { length: 50 }),
  pattern: varchar("pattern", { length: 50 }),
  unit: varchar("unit", { length: 10 }).notNull().default("meter"),
  stockQty: numeric("stock_qty", { precision: 10, scale: 2 }).notNull().default("0"),
  reorderLevel: numeric("reorder_level", { precision: 10, scale: 2 }).notNull().default("10"),
  costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 2 }).notNull().default("0"),
  sellingPricePerUnit: numeric("selling_price_per_unit", { precision: 12, scale: 2 }).notNull().default("0"),
  supplierId: bigint("supplier_id", { mode: "number" }).references(() => suppliers.id),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fabricMovements = pgTable("fabric_movements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  fabricId: bigint("fabric_id", { mode: "number" }).notNull().references(() => fabrics.id, { onDelete: "cascade" }),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  movementType: varchar("movement_type", { length: 30 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  referenceType: varchar("reference_type", { length: 30 }),
  referenceId: bigint("reference_id", { mode: "number" }),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tailorOrders = pgTable("tailor_orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  orderKind: varchar("order_kind", { length: 20 }).notNull().default("custom"),
  customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  measurementProfileId: bigint("measurement_profile_id", { mode: "number" }),
  garmentType: varchar("garment_type", { length: 50 }).notNull(),
  fabricId: bigint("fabric_id", { mode: "number" }).references(() => fabrics.id),
  fabricSource: varchar("fabric_source", { length: 20 }).notNull().default("shop"),
  fabricQtyUsed: numeric("fabric_qty_used", { precision: 10, scale: 2 }),
  styleNotes: text("style_notes"),
  assignedTailorId: bigint("assigned_tailor_id", { mode: "number" }).references(() => users.id),
  assignedCutterId: bigint("assigned_cutter_id", { mode: "number" }).references(() => users.id),

  orderDate: date("order_date").notNull(),
  promisedDate: date("promised_date"),
  deliveredDate: date("delivered_date"),

  currentStage: varchar("current_stage", { length: 30 }).notNull().default("measurement"),

  stitchingCharge: numeric("stitching_charge", { precision: 12, scale: 2 }).notNull().default("0"),
  fabricCharge: numeric("fabric_charge", { precision: 12, scale: 2 }).notNull().default("0"),
  otherCharges: numeric("other_charges", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  advancePaid: numeric("advance_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),

  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tailorOrderStages = pgTable("tailor_order_stages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tailorOrderId: bigint("tailor_order_id", { mode: "number" }).notNull().references(() => tailorOrders.id, { onDelete: "cascade" }),
  stage: varchar("stage", { length: 30 }).notNull(),
  notes: text("notes"),
  changedBy: bigint("changed_by", { mode: "number" }).references(() => users.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  tailorOrderId: bigint("tailor_order_id", { mode: "number" }).references(() => tailorOrders.id),
  appointmentType: varchar("appointment_type", { length: 30 }).notNull().default("fitting"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  assignedTo: bigint("assigned_to", { mode: "number" }).references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
