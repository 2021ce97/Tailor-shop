import { pgTable, bigserial, bigint, varchar, text, timestamp, numeric, integer, date, unique } from "drizzle-orm/pg-core";
import { users, suppliers, branches } from "./schema-core";

export const categories = pgTable("categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  parentId: bigint("parent_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  categoryId: bigint("category_id", { mode: "number" }).references(() => categories.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  brand: varchar("brand", { length: 100 }),
  gender: varchar("gender", { length: 20 }),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull().default("0"),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
  imageUrl: text("image_url"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// SKU/barcode are unique per-branch, not globally — see migration 006.
export const productVariants = pgTable("product_variants", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  productId: bigint("product_id", { mode: "number" }).notNull().references(() => products.id, { onDelete: "cascade" }),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  sku: varchar("sku", { length: 60 }).notNull(),
  size: varchar("size", { length: 20 }),
  color: varchar("color", { length: 50 }),
  barcode: varchar("barcode", { length: 60 }),
  price: numeric("price", { precision: 12, scale: 2 }),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  stockQty: integer("stock_qty").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(5),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  branchSkuUnique: unique().on(t.branchId, t.sku),
  branchBarcodeUnique: unique().on(t.branchId, t.barcode),
}));

export const stockMovements = pgTable("stock_movements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  variantId: bigint("variant_id", { mode: "number" }).notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  movementType: varchar("movement_type", { length: 30 }).notNull(),
  quantity: integer("quantity").notNull(),
  referenceType: varchar("reference_type", { length: 30 }),
  referenceId: bigint("reference_id", { mode: "number" }),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  poNo: varchar("po_no", { length: 50 }).notNull().unique(),
  supplierId: bigint("supplier_id", { mode: "number" }).notNull().references(() => suppliers.id),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  orderDate: date("order_date").notNull(),
  expectedDate: date("expected_date"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  purchaseOrderId: bigint("purchase_order_id", { mode: "number" }).notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  variantId: bigint("variant_id", { mode: "number" }).references(() => productVariants.id),
  // No .references() here to avoid a circular import with schema-tailoring
  // (which would need to import back from this file for other tables).
  // The actual FK constraint lives in migration 007's SQL.
  fabricId: bigint("fabric_id", { mode: "number" }),
  description: varchar("description", { length: 200 }),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
  receivedQty: numeric("received_qty", { precision: 12, scale: 2 }).notNull().default("0"),
});
