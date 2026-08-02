"use server";

import { z } from "zod";
import { db, fabrics, suppliers, fabricMovements } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

const fabricSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fabricType: z.string().optional(),
  color: z.string().optional(),
  pattern: z.string().optional(),
  unit: z.enum(["meter", "yard", "piece"]).default("meter"),
  stockQty: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(10),
  costPerUnit: z.coerce.number().min(0).default(0),
  sellingPricePerUnit: z.coerce.number().min(0).default(0),
});

export type FabricFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

export async function createFabric(_prevState: FabricFormState, formData: FormData): Promise<FabricFormState> {
  const parsed = fabricSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();

  try {
    await db.transaction(async (tx) => {
      const [fabric] = await tx
        .insert(fabrics)
        .values({
          name: parsed.data.name,
          branchId: session.branchId,
          fabricType: parsed.data.fabricType || null,
          color: parsed.data.color || null,
          pattern: parsed.data.pattern || null,
          unit: parsed.data.unit,
          stockQty: String(parsed.data.stockQty),
          reorderLevel: String(parsed.data.reorderLevel),
          costPerUnit: String(parsed.data.costPerUnit),
          sellingPricePerUnit: String(parsed.data.sellingPricePerUnit),
        })
        .returning();

      if (parsed.data.stockQty > 0) {
        await tx.insert(fabricMovements).values({
          fabricId: fabric.id,
          branchId: session.branchId,
          movementType: "adjustment",
          quantity: String(parsed.data.stockQty),
          referenceType: "manual",
          notes: "Opening stock",
          createdBy: session.userId,
        });
      }
    });

    revalidatePath("/fabrics");
    return { status: "success", message: `Fabric "${parsed.data.name}" added.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to add fabric." };
  }
}

const restockSchema = z.object({
  fabricId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  notes: z.string().optional(),
});

export async function restockFabric(formData: FormData): Promise<void> {
  const parsed = restockSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const session = await requireSession();

  const [fabric] = await db.select({ stockQty: fabrics.stockQty }).from(fabrics).where(eq(fabrics.id, parsed.data.fabricId));
  if (!fabric) return;

  await db.transaction(async (tx) => {
    await tx
      .update(fabrics)
      .set({ stockQty: String(Number(fabric.stockQty) + parsed.data.quantity), updatedAt: new Date() })
      .where(eq(fabrics.id, parsed.data.fabricId));

    await tx.insert(fabricMovements).values({
      fabricId: parsed.data.fabricId,
      branchId: session.branchId,
      movementType: "purchase_in",
      quantity: String(parsed.data.quantity),
      referenceType: "manual",
      notes: parsed.data.notes || "Restock",
      createdBy: session.userId,
    });
  });

  revalidatePath("/fabrics");
}

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export type SupplierFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

export async function createSupplier(_prevState: SupplierFormState, formData: FormData): Promise<SupplierFormState> {
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await requireSession();

  try {
    await db.insert(suppliers).values({
      name: parsed.data.name,
      type: parsed.data.type || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    });
    revalidatePath("/suppliers");
    return { status: "success", message: `Supplier "${parsed.data.name}" added.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to add supplier." };
  }
}
