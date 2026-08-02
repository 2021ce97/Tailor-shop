import { pgTable, bigserial, bigint, varchar, text, timestamp, numeric, date, integer, boolean } from "drizzle-orm/pg-core";
import { users, customers, suppliers, branches } from "./schema-core";
import { productVariants } from "./schema-inventory";
import { tailorOrders } from "./schema-tailoring";

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  accountCode: varchar("account_code", { length: 30 }).notNull().unique(),
  accountName: varchar("account_name", { length: 200 }).notNull(),
  accountType: varchar("account_type", { length: 30 }).notNull(),
  balanceType: varchar("balance_type", { length: 10 }).notNull().default("debit"),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  txnNo: varchar("txn_no", { length: 50 }).notNull().unique(),
  txnType: varchar("txn_type", { length: 30 }).notNull(),
  txnDate: date("txn_date").notNull(),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  referenceType: varchar("reference_type", { length: 30 }),
  referenceId: bigint("reference_id", { mode: "number" }),
  customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
  supplierId: bigint("supplier_id", { mode: "number" }).references(() => suppliers.id),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionLines = pgTable("transaction_lines", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  transactionId: bigint("transaction_id", { mode: "number" }).notNull().references(() => transactions.id, { onDelete: "cascade" }),
  accountId: bigint("account_id", { mode: "number" }).notNull().references(() => chartOfAccounts.id),
  description: text("description"),
  debitAmount: numeric("debit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  creditAmount: numeric("credit_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sales = pgTable("sales", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  saleNo: varchar("sale_no", { length: 50 }).notNull().unique(),
  customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  saleDate: date("sale_date").notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 14, scale: 2 }).notNull().default("0"),
  paymentMethod: varchar("payment_method", { length: 30 }),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  cashierId: bigint("cashier_id", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  saleId: bigint("sale_id", { mode: "number" }).notNull().references(() => sales.id, { onDelete: "cascade" }),
  variantId: bigint("variant_id", { mode: "number" }).notNull().references(() => productVariants.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
  returnedQty: integer("returned_qty").notNull().default(0),
});

export const tailorOrderPayments = pgTable("tailor_order_payments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tailorOrderId: bigint("tailor_order_id", { mode: "number" }).notNull().references(() => tailorOrders.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  receivedBy: bigint("received_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  expenseNo: varchar("expense_no", { length: 50 }).notNull().unique(),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  category: varchar("category", { length: 50 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  paidVia: varchar("paid_via", { length: 30 }),
  notes: text("notes"),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Sales returns / exchanges (migration 007) ---

export const saleReturns = pgTable("sale_returns", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  returnNo: varchar("return_no", { length: 50 }).notNull().unique(),
  saleId: bigint("sale_id", { mode: "number" }).notNull().references(() => sales.id),
  branchId: bigint("branch_id", { mode: "number" }).notNull().references(() => branches.id).default(1),
  returnDate: date("return_date").notNull(),
  reason: text("reason"),
  refundAmount: numeric("refund_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  refundMethod: varchar("refund_method", { length: 30 }),
  newSaleId: bigint("new_sale_id", { mode: "number" }).references(() => sales.id),
  processedBy: bigint("processed_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saleReturnItems = pgTable("sale_return_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  saleReturnId: bigint("sale_return_id", { mode: "number" }).notNull().references(() => saleReturns.id, { onDelete: "cascade" }),
  saleItemId: bigint("sale_item_id", { mode: "number" }).notNull().references(() => saleItems.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
});
