"use server";

import { z } from "zod";
import { createPurchaseOrder, receivePurchaseOrder, recordSupplierPayment } from "@/lib/accounting/purchase-orders";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const lineSchema = z.object({
  lineType: z.enum(["variant", "fabric", "other"]),
  variantId: z.coerce.number().int().positive().optional(),
  fabricId: z.coerce.number().int().positive().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
});

const createPoSchema = z.object({
  poNo: z.string().min(1, "PO number is required"),
  supplierId: z.coerce.number().int().positive("Select a supplier"),
  orderDate: z.string().min(1),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  itemsJson: z.string(),
});

export type PoFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]>; poId?: number };

export async function submitPurchaseOrder(_prevState: PoFormState, formData: FormData): Promise<PoFormState> {
  const parsed = createPoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let rawItems;
  try {
    rawItems = z.array(lineSchema).min(1, "Add at least one line item").parse(JSON.parse(parsed.data.itemsJson));
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Invalid line items." };
  }

  const session = await requireSession();

  try {
    const po = await createPurchaseOrder({
      poNo: parsed.data.poNo,
      supplierId: parsed.data.supplierId,
      branchId: session.branchId,
      orderDate: parsed.data.orderDate,
      expectedDate: parsed.data.expectedDate,
      notes: parsed.data.notes,
      items: rawItems.map((i) => ({
        variantId: i.lineType === "variant" ? i.variantId : undefined,
        fabricId: i.lineType === "fabric" ? i.fabricId : undefined,
        description: i.description,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
      createdBy: session.userId,
    });

    revalidatePath("/purchase-orders");
    return { status: "success", message: `Purchase order ${po.poNo} created.`, poId: po.id };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to create purchase order." };
  }
}

const receiveSchema = z.object({
  purchaseOrderId: z.coerce.number().int().positive(),
  linesJson: z.string(),
});

export type ReceiveFormState = { status: "idle" | "success" | "error"; message?: string };

const supplierPaymentSchema = z.object({
  purchaseOrderId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["cash", "bank"]),
  notes: z.string().optional(),
});

export type SupplierPaymentState = { status: "idle" | "success" | "error"; message?: string };

export async function submitReceivePurchaseOrder(_prevState: ReceiveFormState, formData: FormData): Promise<ReceiveFormState> {
  const parsed = receiveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "Please check the receiving quantities." };

  let lines;
  try {
    lines = z.array(z.object({ poItemId: z.number().int().positive(), receiveQty: z.number().min(0) })).parse(JSON.parse(parsed.data.linesJson));
  } catch {
    return { status: "error", message: "Invalid receiving quantities." };
  }

  const session = await requireSession();

  try {
    await receivePurchaseOrder({
      purchaseOrderId: parsed.data.purchaseOrderId,
      branchId: session.branchId,
      lines,
      receivedBy: session.userId,
    });
    revalidatePath(`/purchase-orders/${parsed.data.purchaseOrderId}`);
    revalidatePath("/purchase-orders");
    return { status: "success", message: "Stock received and recorded." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to receive purchase order." };
  }
}

export async function submitSupplierPayment(_prevState: SupplierPaymentState, formData: FormData): Promise<SupplierPaymentState> {
  const parsed = supplierPaymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please enter a valid payment amount and method." };
  }

  const session = await requireSession();

  try {
    await recordSupplierPayment({
      purchaseOrderId: parsed.data.purchaseOrderId,
      branchId: session.branchId,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      paidBy: session.userId,
      notes: parsed.data.notes,
    });

    revalidatePath(`/purchase-orders/${parsed.data.purchaseOrderId}`);
    revalidatePath("/purchase-orders");
    return { status: "success", message: "Supplier payment recorded." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to record supplier payment." };
  }
}
