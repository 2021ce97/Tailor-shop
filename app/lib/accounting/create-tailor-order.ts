import {
  db,
  tailorOrders,
  tailorOrderStages,
  measurementProfiles,
  fabrics,
  fabricMovements,
  transactions,
  transactionLines,
  chartOfAccounts,
} from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * Creates a new tailor order (custom garment or alteration) and posts
 * its opening accounting entries. Mirrors the proven pattern from the
 * travel agency system: a balance-or-throw guard on every posting.
 *
 * On order creation, only the ADVANCE payment (if any) is posted —
 * the full income isn't recognized until the order is delivered
 * (see markOrderDelivered), which matches how tailoring businesses
 * actually work: money taken upfront is a liability (an obligation to
 * deliver a garment) until the work is done.
 *
 *   If advance > 0:
 *     Dr  Cash/Bank                  = advance
 *     Cr  Customer Advances (2100)   = advance
 *
 * If fabric is drawn from the shop's own stock, that's logged as a
 * fabric_movements row (order_consumed) immediately — the fabric cost
 * itself is recognized as an expense at delivery time, alongside the
 * income, so cost and income land in the same accounting period.
 */

export interface CreateTailorOrderInput {
  orderNo: string;
  orderKind: "custom" | "alteration";
  customerId: number;
  branchId: number;
  measurementProfileId?: number;
  garmentType: string;
  fabricId?: number;
  fabricSource: "shop" | "customer_provided";
  fabricQtyUsed?: number;
  styleNotes?: string;
  assignedTailorId?: number;
  assignedCutterId?: number;
  orderDate: string;
  promisedDate?: string;
  stitchingCharge: number;
  fabricCharge: number;
  otherCharges: number;
  discount: number;
  advancePaid: number;
  advancePaymentMethod?: "cash" | "bank";
  notes?: string;
  createdBy: number;
}

export async function createTailorOrder(input: CreateTailorOrderInput) {
  const totalAmount = input.stitchingCharge + input.fabricCharge + input.otherCharges - input.discount;
  const balanceDue = totalAmount - input.advancePaid;

  if (input.advancePaid > totalAmount) {
    throw new Error("Advance paid cannot exceed the total order amount.");
  }

  // If drawing from shop fabric stock, make sure there's enough.
  let fabricRow: { id: number; stockQty: string } | undefined;
  if (input.fabricSource === "shop" && input.fabricId) {
    const [f] = await db
      .select({ id: fabrics.id, stockQty: fabrics.stockQty })
      .from(fabrics)
      .where(and(eq(fabrics.id, input.fabricId), eq(fabrics.branchId, input.branchId)));
    if (!f) throw new Error("Selected fabric not found.");
    if (input.fabricQtyUsed && Number(f.stockQty) < input.fabricQtyUsed) {
      throw new Error(`Not enough fabric in stock: have ${f.stockQty}, need ${input.fabricQtyUsed}.`);
    }
    fabricRow = f;
  }

  return await db.transaction(async (tx) => {
    if (input.measurementProfileId) {
      const [profile] = await tx
        .select({ id: measurementProfiles.id })
        .from(measurementProfiles)
        .where(and(eq(measurementProfiles.id, input.measurementProfileId), eq(measurementProfiles.customerId, input.customerId)));
      if (!profile) throw new Error("The selected measurement profile does not belong to this customer.");
    }

    const [order] = await tx
      .insert(tailorOrders)
      .values({
        orderNo: input.orderNo,
        orderKind: input.orderKind,
        customerId: input.customerId,
        branchId: input.branchId,
        measurementProfileId: input.measurementProfileId,
        garmentType: input.garmentType,
        fabricId: input.fabricId,
        fabricSource: input.fabricSource,
        fabricQtyUsed: input.fabricQtyUsed !== undefined ? String(input.fabricQtyUsed) : undefined,
        styleNotes: input.styleNotes,
        assignedTailorId: input.assignedTailorId,
        assignedCutterId: input.assignedCutterId,
        orderDate: input.orderDate,
        promisedDate: input.promisedDate,
        currentStage: "measurement",
        stitchingCharge: String(input.stitchingCharge),
        fabricCharge: String(input.fabricCharge),
        otherCharges: String(input.otherCharges),
        discount: String(input.discount),
        totalAmount: String(totalAmount),
        advancePaid: String(input.advancePaid),
        balanceDue: String(balanceDue),
        status: "in_progress",
        notes: input.notes,
        createdBy: input.createdBy,
      })
      .returning();

    await tx.insert(tailorOrderStages).values({
      tailorOrderId: order.id,
      stage: "measurement",
      notes: "Order created",
      changedBy: input.createdBy,
    });

    // Deduct fabric from shop stock immediately (it's physically cut
    // now, even though the income isn't recognized until delivery).
    if (fabricRow && input.fabricQtyUsed) {
      await tx
        .update(fabrics)
        .set({ stockQty: String(Number(fabricRow.stockQty) - input.fabricQtyUsed), updatedAt: new Date() })
        .where(eq(fabrics.id, fabricRow.id));

      await tx.insert(fabricMovements).values({
        fabricId: fabricRow.id,
        branchId: input.branchId,
        movementType: "order_consumed",
        quantity: String(-input.fabricQtyUsed),
        referenceType: "tailor_order",
        referenceId: order.id,
        notes: `Consumed by order ${order.orderNo}`,
        createdBy: input.createdBy,
      });
    }

    // Post the advance, if any.
    if (input.advancePaid > 0) {
      const cashAccountCode = input.advancePaymentMethod === "bank" ? "1010" : "1000";
      const [cashAccount] = await tx
        .select({ id: chartOfAccounts.id })
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.accountCode, cashAccountCode));
      const [advancesAccount] = await tx
        .select({ id: chartOfAccounts.id })
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.accountCode, "2100"));

      if (!cashAccount || !advancesAccount) {
        throw new Error("Standard chart of accounts is missing (1000/1010, 2100). Run the initial_setup seed first.");
      }

      const [txn] = await tx
        .insert(transactions)
        .values({
          txnNo: `${input.orderNo}-ADV`,
          txnType: "tailor_order",
          txnDate: input.orderDate,
          branchId: input.branchId,
          referenceType: "tailor_order",
          referenceId: order.id,
          customerId: input.customerId,
          totalAmount: String(input.advancePaid),
          notes: `Advance for order ${order.orderNo}`,
          status: "draft",
          createdBy: input.createdBy,
        })
        .returning();

      const lines = [
        { accountId: cashAccount.id, debitAmount: input.advancePaid, creditAmount: 0 },
        { accountId: advancesAccount.id, debitAmount: 0, creditAmount: input.advancePaid },
      ];
      const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
      const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Advance posting does not balance: debit ${totalDebit} != credit ${totalCredit}.`);
      }

      await tx.insert(transactionLines).values(
        lines.map((l) => ({
          transactionId: txn.id,
          accountId: l.accountId,
          description: `Advance for order ${order.orderNo}`,
          debitAmount: String(l.debitAmount),
          creditAmount: String(l.creditAmount),
        }))
      );

      await tx.update(transactions).set({ status: "posted" }).where(eq(transactions.id, txn.id));
    }

    return order;
  });
}
