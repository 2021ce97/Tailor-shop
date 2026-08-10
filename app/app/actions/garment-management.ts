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
  roles,
  users,
  db,
} from "@/lib/db";
import { deliverTailorOrder } from "@/lib/accounting/deliver-tailor-order";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

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
  const capacityOrders = Number(text(formData, "capacityOrders") || 10);
  if (!code || capacityGarments < 1 || capacityOrders < 1) throw new Error("Enter a location code and valid capacities.");
  await db.insert(storageLocations).values({ branchId: session.branchId, code, capacityGarments, capacityOrders });
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

export async function assignWorker(formData: FormData) {
  const parsed = assignmentSchema.parse(Object.fromEntries(formData.entries()));
  const validStage = parsed.workType === "cutter" ? ["measurement", "fabric_ready", "cutting"] : ["cutting_done", "stitching"];
  const [item] = await db.select().from(tailorOrderItems).where(eq(tailorOrderItems.id, parsed.garmentItemId));
  if (!item || !validStage.includes(item.currentStage)) throw new Error("This garment is not ready for that assignment.");
  await db.transaction(async (tx) => {
    await tx.insert(workerAssignments).values({ garmentItemId: parsed.garmentItemId, businessContactId: parsed.businessContactId, workType: parsed.workType, agreedRate: String(parsed.agreedRate), notes: parsed.notes || null });
    await tx.update(tailorOrderItems).set({ currentStage: parsed.workType === "cutter" ? "cutting" : "stitching", updatedAt: new Date() }).where(eq(tailorOrderItems.id, parsed.garmentItemId));
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
    await tx.insert(contactAccountEntries).values({ businessContactId: assignment.businessContactId, entryType: "completed_work", debitAmount: String(assignment.agreedRate), entryDate: new Date().toISOString().slice(0, 10), notes: `${assignment.workType} work completed` });
  });
  revalidatePath("/stitching-cutting");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function approveQuality(formData: FormData) {
  const garmentItemId = Number(text(formData, "garmentItemId"));
  await db.update(tailorOrderItems).set({ currentStage: "ready", updatedAt: new Date() }).where(and(eq(tailorOrderItems.id, garmentItemId), eq(tailorOrderItems.currentStage, "quality_check")));
  revalidatePath("/stitching-cutting");
  revalidatePath("/delivery");
  revalidatePath("/dashboard");
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
