"use server";

import { z } from "zod";
import { createTailorOrder } from "@/lib/accounting/create-tailor-order";
import { deliverTailorOrder } from "@/lib/accounting/deliver-tailor-order";
import { requireSession } from "@/lib/auth/get-session";
import { db, tailorOrders, tailorOrderStages, tailorOrderPayments, chartOfAccounts, transactions, transactionLines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const createSchema = z.object({
  orderNo: z.string().min(1, "Order number is required"),
  orderKind: z.enum(["custom", "alteration"]),
  customerId: z.coerce.number().int().positive("Select a customer"),
  measurementProfileId: z.coerce.number().int().positive().optional(),
  garmentType: z.string().min(1),
  fabricId: z.coerce.number().int().positive().optional(),
  fabricSource: z.enum(["shop", "customer_provided"]),
  fabricQtyUsed: z.coerce.number().min(0).optional(),
  styleNotes: z.string().optional(),
  assignedTailorId: z.coerce.number().int().positive().optional(),
  assignedCutterId: z.coerce.number().int().positive().optional(),
  orderDate: z.string().min(1),
  promisedDate: z.string().optional(),
  stitchingCharge: z.coerce.number().min(0),
  fabricCharge: z.coerce.number().min(0).default(0),
  otherCharges: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  advancePaid: z.coerce.number().min(0).default(0),
  advancePaymentMethod: z.enum(["cash", "bank"]).default("cash"),
  notes: z.string().optional(),
});

export type TailorOrderFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  orderId?: number;
};

export async function submitTailorOrder(_prevState: TailorOrderFormState, formData: FormData): Promise<TailorOrderFormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();

  try {
    const order = await createTailorOrder({ ...parsed.data, branchId: session.branchId, createdBy: session.userId });
    revalidatePath("/tailor-orders");
    return { status: "success", message: `Order ${order.orderNo} created.`, orderId: order.id };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to create order." };
  }
}

const stageSchema = z.object({
  tailorOrderId: z.coerce.number().int().positive(),
  stage: z.enum(["measurement", "fabric_selected", "cutting", "stitching", "fitting", "finishing", "ready"]),
  notes: z.string().optional(),
});

export async function advanceOrderStage(formData: FormData): Promise<void> {
  const parsed = stageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const session = await requireSession();

  await db.transaction(async (tx) => {
    await tx.insert(tailorOrderStages).values({
      tailorOrderId: parsed.data.tailorOrderId,
      stage: parsed.data.stage,
      notes: parsed.data.notes || null,
      changedBy: session.userId,
    });
    await tx.update(tailorOrders).set({ currentStage: parsed.data.stage, updatedAt: new Date() }).where(eq(tailorOrders.id, parsed.data.tailorOrderId));
  });

  revalidatePath(`/tailor-orders/${parsed.data.tailorOrderId}`);
  revalidatePath("/tailor-orders");
}

const paymentSchema = z.object({
  tailorOrderId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["cash", "bank"]).default("cash"),
  paymentDate: z.string().min(1),
});

export type PaymentFormState = { status: "idle" | "success" | "error"; message?: string };

/**
 * Records a mid-order payment (not the advance at creation, not the
 * final delivery collection — a partial payment somewhere in between,
 * e.g. paying more before pickup). Posts straight to Customer Advances
 * since the order isn't delivered yet, same treatment as the initial
 * advance: it's a deposit against future income, not income itself.
 */
export async function recordOrderPayment(_prevState: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "Please check the payment amount and date." };

  const session = await requireSession();

  const [order] = await db.select().from(tailorOrders).where(eq(tailorOrders.id, parsed.data.tailorOrderId));
  if (!order) return { status: "error", message: "Order not found." };
  if (parsed.data.amount > Number(order.balanceDue) + 0.01) {
    return { status: "error", message: `Payment (${parsed.data.amount}) exceeds balance due (${order.balanceDue}).` };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(tailorOrderPayments).values({
        tailorOrderId: order.id,
        amount: String(parsed.data.amount),
        paymentMethod: parsed.data.paymentMethod,
        paymentDate: parsed.data.paymentDate,
        receivedBy: session.userId,
      });

      const cashAccountCode = parsed.data.paymentMethod === "bank" ? "1010" : "1000";
      const [cashAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, cashAccountCode));
      const [advancesAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "2100"));
      if (!cashAccount || !advancesAccount) throw new Error("Chart of accounts missing 1000/1010 or 2100.");

      const [txn] = await tx
        .insert(transactions)
        .values({
          txnNo: `${order.orderNo}-PMT-${Date.now()}`,
          txnType: "tailor_order",
          txnDate: parsed.data.paymentDate,
          branchId: order.branchId,
          referenceType: "tailor_order",
          referenceId: order.id,
          customerId: order.customerId,
          totalAmount: String(parsed.data.amount),
          notes: `Payment towards order ${order.orderNo}`,
          status: "posted",
          createdBy: session.userId,
        })
        .returning();

      await tx.insert(transactionLines).values([
        { transactionId: txn.id, accountId: cashAccount.id, description: "Order payment", debitAmount: String(parsed.data.amount), creditAmount: "0" },
        { transactionId: txn.id, accountId: advancesAccount.id, description: "Order payment", debitAmount: "0", creditAmount: String(parsed.data.amount) },
      ]);

      await tx
        .update(tailorOrders)
        .set({
          advancePaid: String(Number(order.advancePaid) + parsed.data.amount),
          balanceDue: String(Number(order.balanceDue) - parsed.data.amount),
          updatedAt: new Date(),
        })
        .where(eq(tailorOrders.id, order.id));
    });

    revalidatePath(`/tailor-orders/${order.id}`);
    return { status: "success", message: "Payment recorded." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to record payment." };
  }
}

const deliverSchema = z.object({
  tailorOrderId: z.coerce.number().int().positive(),
  balanceCollected: z.coerce.number().min(0),
  paymentMethod: z.enum(["cash", "bank"]).default("cash"),
  deliveredDate: z.string().min(1),
});

export type DeliverFormState = { status: "idle" | "success" | "error"; message?: string };

export async function submitDeliverOrder(_prevState: DeliverFormState, formData: FormData): Promise<DeliverFormState> {
  const parsed = deliverSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "Please check the delivery details." };

  const session = await requireSession();

  try {
    await deliverTailorOrder({ ...parsed.data, changedBy: session.userId });
    revalidatePath(`/tailor-orders/${parsed.data.tailorOrderId}`);
    revalidatePath("/tailor-orders");
    return { status: "success", message: "Order marked as delivered." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to mark delivered." };
  }
}
