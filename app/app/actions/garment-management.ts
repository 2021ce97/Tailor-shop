"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth/get-session";
import {
  businessContacts,
  contactAccountEntries,
  garmentDesignCategories,
  garmentDesignOptions,
  garmentMeasurementFields,
  garmentStorageAssignments,
  garmentTypes,
  storageLocations,
  tailorOrderItems,
  workerAssignments,
  tailorOrders,
  users,
  transactions,
  transactionLines,
  chartOfAccounts,
  db,
} from "@/lib/db";
import { deliverTailorOrder } from "@/lib/accounting/deliver-tailor-order";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function addGarmentType(formData: FormData) {
  const code = text(formData, "code").toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const nameFa = text(formData, "nameFa");
  const namePs = text(formData, "namePs");
  if (!code || !nameFa || !namePs) throw new Error("Garment code and both language names are required.");
  await db.insert(garmentTypes).values({ code, nameFa, namePs });
  revalidatePath("/settings");
}

export async function addMeasurementField(formData: FormData) {
  const garmentTypeId = Number(text(formData, "garmentTypeId"));
  const code = text(formData, "code").toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const labelFa = text(formData, "labelFa");
  const labelPs = text(formData, "labelPs");
  if (!garmentTypeId || !code || !labelFa || !labelPs) throw new Error("Complete the measurement field information.");
  await db.insert(garmentMeasurementFields).values({ garmentTypeId, code, labelFa, labelPs, unit: text(formData, "unit") || "inch", isRequired: formData.get("isRequired") === "on" });
  revalidatePath("/settings");
}

export async function addDesignOption(formData: FormData) {
  const garmentTypeId = Number(text(formData, "garmentTypeId"));
  const categoryId = Number(text(formData, "categoryId"));
  const categoryFa = text(formData, "categoryFa");
  const categoryPs = text(formData, "categoryPs");
  const labelFa = text(formData, "labelFa");
  const labelPs = text(formData, "labelPs");
  if (!garmentTypeId || !labelFa || !labelPs) throw new Error("Complete the design option information.");
  let resolvedCategoryId = categoryId;
  if (!resolvedCategoryId) {
    if (!categoryFa || !categoryPs) throw new Error("Choose an existing design category or enter both category names.");
    const [category] = await db.insert(garmentDesignCategories).values({ garmentTypeId, code: categoryFa.replace(/\s+/g, "_").toLowerCase(), labelFa: categoryFa, labelPs: categoryPs }).returning({ id: garmentDesignCategories.id });
    resolvedCategoryId = category.id;
  }
  await db.insert(garmentDesignOptions).values({ categoryId: resolvedCategoryId, labelFa, labelPs });
  revalidatePath("/settings");
}

export async function createBusinessContact(formData: FormData) {
  const session = await requireSession();
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const roles = formData.getAll("roles").map(String).filter(Boolean);
  if (!name || roles.length === 0) throw new Error("Name and at least one role are required.");
  const contactCode = `CNT-${Date.now().toString().slice(-8)}`;
  await db.insert(businessContacts).values({ branchId: session.branchId, contactCode, name, phone: phone || null, roles, notes: text(formData, "notes") || null });
  revalidatePath("/accounts");
  revalidatePath("/stitching-cutting");
}

export async function addStorageLocation(formData: FormData) {
  const session = await requireSession();
  const code = text(formData, "code").toUpperCase();
  const capacityGarments = Number(text(formData, "capacityGarments") || 20);
  const capacityOrders = Number(text(formData, "capacityOrders") || capacityGarments);
  if (!code || capacityGarments < 1 || capacityOrders < 1) throw new Error("Enter a location code and valid capacities.");
  await db.insert(storageLocations).values({ branchId: session.branchId, code, capacityGarments, capacityOrders });
  revalidatePath("/cabinet");
}

export async function removeStorageLocation(formData: FormData) {
  const session = await requireSession();
  const locationId = Number(text(formData, "locationId"));
  const [location] = await db.select().from(storageLocations).where(and(eq(storageLocations.id, locationId), eq(storageLocations.branchId, session.branchId)));
  if (!location) throw new Error("Cabinet was not found.");
  const activeAssignments = await db.select({ id: garmentStorageAssignments.id }).from(garmentStorageAssignments).where(and(eq(garmentStorageAssignments.storageLocationId, locationId), isNull(garmentStorageAssignments.removedAt)));
  if (activeAssignments.length > 0) throw new Error("Deliver or move the garments before removing this cabinet.");
  await db.update(storageLocations).set({ isActive: false }).where(eq(storageLocations.id, locationId));
  revalidatePath("/cabinet");
}

export async function storeGarment(formData: FormData) {
  const session = await requireSession();
  const garmentItemId = Number(text(formData, "garmentItemId"));
  const storageLocationId = Number(text(formData, "storageLocationId"));
  if (!garmentItemId || !storageLocationId) throw new Error("Choose a garment and a storage location.");
  const [location] = await db.select().from(storageLocations).where(and(eq(storageLocations.id, storageLocationId), eq(storageLocations.branchId, session.branchId)));
  if (!location) throw new Error("Storage location was not found.");
  const active = await db.select({ garmentItemId: garmentStorageAssignments.garmentItemId }).from(garmentStorageAssignments).where(and(eq(garmentStorageAssignments.storageLocationId, storageLocationId), isNull(garmentStorageAssignments.removedAt)));
  const distinctOrders = await db.execute<{ count: string }>(sql`SELECT COUNT(DISTINCT item.tailor_order_id) AS count FROM garment_storage_assignments assignment JOIN tailor_order_items item ON item.id = assignment.garment_item_id WHERE assignment.storage_location_id = ${storageLocationId} AND assignment.removed_at IS NULL`);
  if (active.length >= location.capacityGarments || Number(distinctOrders[0]?.count ?? 0) >= location.capacityOrders) throw new Error("This cupboard location is full.");
  await db.transaction(async (tx) => {
    await tx.update(garmentStorageAssignments).set({ removedAt: new Date() }).where(and(eq(garmentStorageAssignments.garmentItemId, garmentItemId), isNull(garmentStorageAssignments.removedAt)));
    await tx.insert(garmentStorageAssignments).values({ garmentItemId, storageLocationId, storedBy: session.userId });
  });
  revalidatePath("/cabinet");
  revalidatePath("/delivery");
}

const assignmentSchema = z.object({ garmentItemId: z.coerce.number().positive(), businessContactId: z.coerce.number().positive(), workType: z.enum(["cutter", "tailor"]), agreedRate: z.coerce.number().min(0), notes: z.string().optional() });

const stagePriority: Record<string, number> = {
  measurement: 1,
  fabric_ready: 2,
  cutting: 3,
  cutting_done: 4,
  stitching: 5,
  quality_check: 6,
  ready: 7,
  delivered: 8,
};

async function syncParentOrderStage(tx: DbTransaction, tailorOrderId: number) {
  const items = await tx
    .select({ currentStage: tailorOrderItems.currentStage })
    .from(tailorOrderItems)
    .where(eq(tailorOrderItems.tailorOrderId, tailorOrderId));

  if (items.length === 0) return;

  const nextStage = items.every((item) => item.currentStage === "delivered")
    ? "delivered"
    : items.every((item) => item.currentStage === "ready" || item.currentStage === "delivered")
      ? "ready"
      : items.reduce((lowest, item) => {
          return (stagePriority[item.currentStage] ?? 99) < (stagePriority[lowest] ?? 99)
            ? item.currentStage
            : lowest;
        }, items[0].currentStage);

  await tx
    .update(tailorOrders)
    .set({
      currentStage: nextStage,
      status: nextStage === "delivered" ? "delivered" : "in_progress",
      updatedAt: new Date(),
    })
    .where(eq(tailorOrders.id, tailorOrderId));
}

export async function assignWorker(formData: FormData) {
  const session = await requireSession();
  const parsed = assignmentSchema.parse(Object.fromEntries(formData.entries()));
  const validStage = parsed.workType === "cutter" ? ["measurement", "fabric_ready", "cutting"] : ["cutting_done", "stitching"];
  const [item] = await db.select().from(tailorOrderItems).where(eq(tailorOrderItems.id, parsed.garmentItemId));
  if (!item || !validStage.includes(item.currentStage)) throw new Error("This garment is not ready for that assignment.");
  const [order] = await db.select({ branchId: tailorOrders.branchId }).from(tailorOrders).where(eq(tailorOrders.id, item.tailorOrderId));
  const [contact] = await db.select({ branchId: businessContacts.branchId }).from(businessContacts).where(eq(businessContacts.id, parsed.businessContactId));
  if (!order || order.branchId !== session.branchId || !contact || contact.branchId !== session.branchId) throw new Error("This assignment does not belong to your branch.");
  await db.transaction(async (tx) => {
    await tx.insert(workerAssignments).values({ garmentItemId: parsed.garmentItemId, businessContactId: parsed.businessContactId, workType: parsed.workType, agreedRate: String(parsed.agreedRate), notes: parsed.notes || null });
    await tx.update(tailorOrderItems).set({ currentStage: parsed.workType === "cutter" ? "cutting" : "stitching", updatedAt: new Date() }).where(eq(tailorOrderItems.id, parsed.garmentItemId));
    await syncParentOrderStage(tx, item.tailorOrderId);
  });
  revalidatePath("/stitching-cutting");
  revalidatePath("/dashboard");
}

export async function completeWorkerAssignment(formData: FormData) {
  const session = await requireSession();
  const assignmentId = Number(text(formData, "assignmentId"));
  const [assignment] = await db.select().from(workerAssignments).where(eq(workerAssignments.id, assignmentId));
  if (!assignment || assignment.status !== "assigned") throw new Error("Assignment was not found or is already completed.");
  const nextStage = assignment.workType === "cutter" ? "cutting_done" : "quality_check";
  await db.transaction(async (tx) => {
    await tx.update(workerAssignments).set({ status: "completed", completedAt: new Date() }).where(eq(workerAssignments.id, assignmentId));
    await tx.update(tailorOrderItems).set({ currentStage: nextStage, updatedAt: new Date() }).where(eq(tailorOrderItems.id, assignment.garmentItemId));
    const [item] = await tx.select({ orderId: tailorOrderItems.tailorOrderId }).from(tailorOrderItems).where(eq(tailorOrderItems.id, assignment.garmentItemId));
    if (!item) throw new Error("Assignment garment was not found.");
    const [order] = await tx.select({ orderNo: tailorOrders.orderNo, branchId: tailorOrders.branchId }).from(tailorOrders).where(eq(tailorOrders.id, item.orderId));
    if (!order || order.branchId !== session.branchId) throw new Error("This assignment does not belong to your branch.");
    const [wageAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "5100"));
    const [payableAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "2000"));
    if (!wageAccount || !payableAccount) throw new Error("Staff Wages or Accounts Payable is missing from the chart of accounts.");
    const [txn] = await tx.insert(transactions).values({ txnNo: `${order.orderNo}-WORK-${assignment.id}`, txnType: "worker_work", txnDate: new Date().toISOString().slice(0, 10), branchId: order.branchId, referenceType: "worker_assignment", referenceId: assignment.id, totalAmount: assignment.agreedRate, notes: `${assignment.workType} work completed`, status: "posted", createdBy: session.userId }).returning();
    await tx.insert(transactionLines).values([{ transactionId: txn.id, accountId: wageAccount.id, description: `${assignment.workType} wages`, debitAmount: assignment.agreedRate, creditAmount: "0" }, { transactionId: txn.id, accountId: payableAccount.id, description: `${assignment.workType} payable`, debitAmount: "0", creditAmount: assignment.agreedRate }]);
    await tx.insert(contactAccountEntries).values({ businessContactId: assignment.businessContactId, transactionId: txn.id, entryType: "completed_work", debitAmount: String(assignment.agreedRate), entryDate: new Date().toISOString().slice(0, 10), notes: `${assignment.workType} work completed` });
    await syncParentOrderStage(tx, item.orderId);
  });
  revalidatePath("/stitching-cutting");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function payBusinessContact(formData: FormData) {
  const session = await requireSession();
  const contactId = Number(text(formData, "businessContactId"));
  const amount = Number(text(formData, "amount"));
  const method = text(formData, "paymentMethod") === "bank" ? "bank" : "cash";
  if (!contactId || !Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid payment amount.");
  const [contact] = await db.select().from(businessContacts).where(and(eq(businessContacts.id, contactId), eq(businessContacts.branchId, session.branchId)));
  if (!contact) throw new Error("Worker account not found.");
  const entries = await db.select().from(contactAccountEntries).where(eq(contactAccountEntries.businessContactId, contactId));
  const payable = entries.reduce((sum, entry) => sum + Number(entry.debitAmount) - Number(entry.creditAmount), 0);
  if (amount > payable + 0.01) throw new Error(`Payment exceeds the outstanding balance of ${payable.toFixed(2)} AFN.`);
  await db.transaction(async (tx) => {
    const [cash] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, method === "bank" ? "1010" : "1000"));
    const [ap] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "2000"));
    if (!cash || !ap) throw new Error("Cash or Accounts Payable is missing from the chart of accounts.");
    const [txn] = await tx.insert(transactions).values({ txnNo: `${contact.contactCode}-PAY-${Date.now()}`, txnType: "worker_payment", txnDate: new Date().toISOString().slice(0, 10), branchId: session.branchId, referenceType: "business_contact", referenceId: contactId, totalAmount: String(amount), notes: `Payment to ${contact.name}`, status: "posted", createdBy: session.userId }).returning();
    await tx.insert(transactionLines).values([{ transactionId: txn.id, accountId: ap.id, description: `Payment to ${contact.name}`, debitAmount: String(amount), creditAmount: "0" }, { transactionId: txn.id, accountId: cash.id, description: `Payment to ${contact.name}`, debitAmount: "0", creditAmount: String(amount) }]);
    await tx.insert(contactAccountEntries).values({ businessContactId: contactId, transactionId: txn.id, entryType: "payment", creditAmount: String(amount), entryDate: new Date().toISOString().slice(0, 10), notes: `Paid via ${method}` });
  });
  revalidatePath(`/accounts/${contactId}`); revalidatePath("/accounts"); revalidatePath("/ledger");
}

async function placeReadyGarmentInCabinet(tx: DbTransaction, garmentItemId: number, branchId: number, userId: number) {
  const locations = await tx.select().from(storageLocations).where(and(eq(storageLocations.branchId, branchId), eq(storageLocations.isActive, true)));
  for (const location of locations) {
    const occupied = await tx.select({ garmentItemId: garmentStorageAssignments.garmentItemId, tailorOrderId: tailorOrderItems.tailorOrderId }).from(garmentStorageAssignments).innerJoin(tailorOrderItems, eq(tailorOrderItems.id, garmentStorageAssignments.garmentItemId)).where(and(eq(garmentStorageAssignments.storageLocationId, location.id), isNull(garmentStorageAssignments.removedAt)));
    if (occupied.length >= location.capacityGarments) continue;
    const [item] = await tx.select({ tailorOrderId: tailorOrderItems.tailorOrderId }).from(tailorOrderItems).where(eq(tailorOrderItems.id, garmentItemId));
    const occupiedOrderIds = new Set(occupied.map((row) => row.tailorOrderId));
    if (!occupiedOrderIds.has(item?.tailorOrderId) && occupiedOrderIds.size >= location.capacityOrders) continue;
    await tx.insert(garmentStorageAssignments).values({ garmentItemId, storageLocationId: location.id, storedBy: userId, storedAt: new Date() });
    return location.code;
  }
  throw new Error("No cabinet space is available. Add a cabinet or free space before marking this garment ready.");
}

export async function approveQuality(formData: FormData) {
  const session = await requireSession();
  const garmentItemId = Number(text(formData, "garmentItemId"));
  const [item] = await db.select({ id: tailorOrderItems.id }).from(tailorOrderItems).where(and(eq(tailorOrderItems.id, garmentItemId), eq(tailorOrderItems.currentStage, "quality_check")));
  if (!item) throw new Error("Only garments awaiting quality approval can be marked ready.");
  await db.transaction(async (tx) => {
    await placeReadyGarmentInCabinet(tx, garmentItemId, session.branchId, session.userId);
    await tx.update(tailorOrderItems).set({ currentStage: "ready", updatedAt: new Date() }).where(eq(tailorOrderItems.id, garmentItemId));
    const [updatedItem] = await tx.select({ orderId: tailorOrderItems.tailorOrderId }).from(tailorOrderItems).where(eq(tailorOrderItems.id, garmentItemId));
    if (updatedItem) await syncParentOrderStage(tx, updatedItem.orderId);
  });
  revalidatePath("/stitching-cutting");
  revalidatePath("/cabinet");
  revalidatePath("/delivery");
  revalidatePath("/dashboard");
}

export async function syncReadyGarmentsToCabinet() {
  const session = await requireSession();
  const readyItems = await db
    .select({ id: tailorOrderItems.id })
    .from(tailorOrderItems)
    .innerJoin(tailorOrders, eq(tailorOrders.id, tailorOrderItems.tailorOrderId))
    .where(
      and(
        eq(tailorOrders.branchId, session.branchId),
        eq(tailorOrderItems.currentStage, "ready"),
        sql`NOT EXISTS (
          SELECT 1
          FROM garment_storage_assignments assignment
          WHERE assignment.garment_item_id = ${tailorOrderItems.id}
          AND assignment.removed_at IS NULL
        )`
      )
    );

  if (readyItems.length === 0) {
    revalidatePath("/cabinet");
    return;
  }

  await db.transaction(async (tx) => {
    for (const item of readyItems) {
      await placeReadyGarmentInCabinet(tx, item.id, session.branchId, session.userId);
    }
  });

  revalidatePath("/cabinet");
  revalidatePath("/delivery");
}

export async function deliverReadyOrder(formData: FormData) {
  const session = await requireSession();
  const garmentItemId = Number(text(formData, "garmentItemId"));
  const balanceCollected = Number(text(formData, "balanceCollected") || 0);
  const paymentMethod = text(formData, "paymentMethod") === "bank" ? "bank" : "cash";
  const [item] = await db.select().from(tailorOrderItems).where(eq(tailorOrderItems.id, garmentItemId));
  if (!item || item.currentStage !== "ready") throw new Error("Only ready garments can be delivered.");
  const siblings = await db.select().from(tailorOrderItems).where(eq(tailorOrderItems.tailorOrderId, item.tailorOrderId));
  if (siblings.some((sibling) => sibling.id !== item.id && sibling.currentStage !== "ready" && sibling.currentStage !== "delivered")) throw new Error("All garments in this order must be ready before delivery.");
  await deliverTailorOrder({ tailorOrderId: item.tailorOrderId, balanceCollected, paymentMethod, deliveredDate: new Date().toISOString().slice(0, 10), changedBy: session.userId });
  await db.transaction(async (tx) => {
    await tx.update(tailorOrderItems).set({ currentStage: "delivered", status: "delivered", updatedAt: new Date() }).where(eq(tailorOrderItems.tailorOrderId, item.tailorOrderId));
    const items = await tx.select({ id: tailorOrderItems.id }).from(tailorOrderItems).where(eq(tailorOrderItems.tailorOrderId, item.tailorOrderId));
    for (const row of items) await tx.update(garmentStorageAssignments).set({ removedAt: new Date() }).where(and(eq(garmentStorageAssignments.garmentItemId, row.id), isNull(garmentStorageAssignments.removedAt)));
  });
  revalidatePath("/delivery"); revalidatePath("/dashboard"); revalidatePath("/tailor-orders");
}

export async function createSystemUser(formData: FormData) {
  const session = await requireSession();
  if (session.roleName !== "owner" && session.roleName !== "manager") throw new Error("Only an owner or manager can create a login.");
  const name = text(formData, "name"); const email = text(formData, "email").toLowerCase(); const password = text(formData, "password"); const roleId = Number(text(formData, "roleId"));
  if (!name || !email || password.length < 6 || !roleId) throw new Error("Enter name, email, a password of at least 6 characters, and a role.");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({ name, email, passwordHash, roleId, branchId: session.branchId, phone: text(formData, "phone") || null });
  revalidatePath("/role-assignment");
}
