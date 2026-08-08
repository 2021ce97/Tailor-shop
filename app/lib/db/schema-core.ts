import {
  pgTable,
  bigserial,
  bigint,
  smallint,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  jsonb,
  date,
  integer,
} from "drizzle-orm/pg-core";

export const shopSettings = pgTable("shop_settings", {
  id: smallint("id").primaryKey().default(1),
  shopName: varchar("shop_name", { length: 200 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  logoUrl: text("logo_url"),
  currency: varchar("currency", { length: 10 }).notNull().default("PKR"),
  taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }).notNull().default("INV"),
  orderPrefix: varchar("order_prefix", { length: 20 }).notNull().default("ORD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branches = pgTable("branches", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  isMain: boolean("is_main").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  roleId: bigint("role_id", { mode: "number" }).notNull().references(() => roles.id),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: varchar("phone", { length: 50 }),
  isTailorStaff: boolean("is_tailor_staff").notNull().default(false),
  dailyWage: numeric("daily_wage", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerCode: varchar("customer_code", { length: 30 }).unique(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  notes: text("notes"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const measurementProfiles = pgTable("measurement_profiles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id, { onDelete: "cascade" }),
  garmentType: varchar("garment_type", { length: 50 }).notNull(),
  label: varchar("label", { length: 100 }),
  measurements: jsonb("measurements").notNull().default({}),
  notes: text("notes"),
  takenBy: bigint("taken_by", { mode: "number" }).references(() => users.id),
  takenAt: date("taken_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const measurementTemplates = pgTable("measurement_templates", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  garmentType: varchar("garment_type", { length: 50 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  fields: jsonb("fields").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  supplierCode: varchar("supplier_code", { length: 30 }).unique(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
