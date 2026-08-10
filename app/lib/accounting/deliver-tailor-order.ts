import { db, tailorOrders, tailorOrderStages, fabrics, transactions, transactionLines, chartOfAccounts } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Marks a tailor order delivered and posts the entries that recognize
 * the sale: income wasn't booked at order-creation time (only the
 * advance liability was), so this is where the accounting actually
 * "happens" for a tailor order — same idea as recognizing revenue on
 * delivery rather than on deposit, which matches how the business
 * really works.
 *
 *   Dr  Customer Advances (2100)     = advance already paid (clears the liability)
 *   Dr  Cash/Bank                    = any balance collected now
 *   Cr  Tailoring/Alteration Income  = total_amount
 *
 *   If shop fabric was used:
 *   Dr  Fabric & Materials Cost (5010) = fabric cost
 *   Cr  Fabric Inventory (1210)        = fabric cost
 *
 * Fabric cost is computed from the fabric's current cost_per_unit at
 * delivery time (not snapshotted at order creation) — acceptable for
 * a single-shop system where cost swings between order and delivery
 * are rare and small; revisit with a cost snapshot column if the shop
 * starts seeing meaningful fabric price volatility.
 */

export interface DeliverTailorOrderInput {
  tailorOrderId: number;
  balanceCollected: number; // amount collected right now, on delivery (may be less than full balance_due)
  paymentMethod?: "cash" | "bank";
  deliveredDate: string;
  changedBy: number;
}

export async function deliverTailorOrder(input: DeliverTailorOrderInput) {
  const [order] = await db.select().from(tailorOrders).where(eq(tailorOrders.id, input.tailorOrderId));
  if (!order) throw new Error("Tailor order not found.");
  if (order.status !== "in_progress") throw new Error(`Order is already ${order.status}.`);

  const balanceDue = Number(order.balanceDue);
  if (input.balanceCollected > balanceDue + 0.01) {
    throw new Error(`Collected amount (${input.balanceCollected}) exceeds balance due (${balanceDue}).`);
  }

  const incomeAccountCode = order.orderKind === "alteration" ? "4020" : "4010";

  return await db.transaction(async (tx) => {
    const [incomeAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, incomeAccountCode));
    const [advancesAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "2100"));
    const cashAccountCode = input.paymentMethod === "bank" ? "1010" : "1000";
    const [cashAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, cashAccountCode));

    if (!incomeAccount || !advancesAccount || !cashAccount) {
      throw new Error("Standard chart of accounts is missing. Run the initial_setup seed first.");
    }

    const advancePaid = Number(order.advancePaid);
    const [receivableAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "1100"));
    if (!receivableAccount) throw new Error("Accounts Receivable (1100) is missing.");
    const lines: { accountId: number; debitAmount: number; creditAmount: number }[] = [];

    if (advancePaid > 0) {
      lines.push({ accountId: advancesAccount.id, debitAmount: advancePaid, creditAmount: 0 });
    }
    if (input.balanceCollected > 0) {
      lines.push({ accountId: cashAccount.id, debitAmount: input.balanceCollected, creditAmount: 0 });
    }
    const outstandingAmount = balanceDue - input.balanceCollected;
    if (outstandingAmount > 0) {
      lines.push({ accountId: receivableAccount.id, debitAmount: outstandingAmount, creditAmount: 0 });
    }
    lines.push({ accountId: incomeAccount.id, debitAmount: 0, creditAmount: Number(order.totalAmount) });

    const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Delivery posting does not balance: debit ${totalDebit} != credit ${totalCredit}.`
      );
    }

    const [txn] = await tx
      .insert(transactions)
      .values({
        txnNo: `${order.orderNo}-DLV`,
        txnType: "tailor_order",
        txnDate: input.deliveredDate,
        branchId: order.branchId,
        referenceType: "tailor_order",
        referenceId: order.id,
        customerId: order.customerId,
        totalAmount: String(order.totalAmount),
        notes: `Delivery of order ${order.orderNo}`,
        status: "draft",
        createdBy: input.changedBy,
      })
      .returning();

    await tx.insert(transactionLines).values(
      lines.map((l) => ({
        transactionId: txn.id,
        accountId: l.accountId,
        description: `Order ${order.orderNo} delivery`,
        debitAmount: String(l.debitAmount),
        creditAmount: String(l.creditAmount),
      }))
    );
    await tx.update(transactions).set({ status: "posted" }).where(eq(transactions.id, txn.id));

    // Fabric cost recognition, if shop fabric was used.
    if (order.fabricSource === "shop" && order.fabricId && order.fabricQtyUsed) {
      const [fabric] = await tx.select({ costPerUnit: fabrics.costPerUnit }).from(fabrics).where(eq(fabrics.id, order.fabricId));
      const fabricCost = fabric ? Number(fabric.costPerUnit) * Number(order.fabricQtyUsed) : 0;

      if (fabricCost > 0) {
        const [fabricCostAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "5010"));
        const [fabricInventoryAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "1210"));

        if (fabricCostAccount && fabricInventoryAccount) {
          const [costTxn] = await tx
            .insert(transactions)
            .values({
              txnNo: `${order.orderNo}-FABCOST`,
              txnType: "journal",
              txnDate: input.deliveredDate,
              branchId: order.branchId,
              referenceType: "tailor_order",
              referenceId: order.id,
              totalAmount: String(fabricCost),
              notes: `Fabric cost for order ${order.orderNo}`,
              status: "posted",
              createdBy: input.changedBy,
            })
            .returning();

          await tx.insert(transactionLines).values([
            { transactionId: costTxn.id, accountId: fabricCostAccount.id, description: "Fabric cost", debitAmount: String(fabricCost), creditAmount: "0" },
            { transactionId: costTxn.id, accountId: fabricInventoryAccount.id, description: "Fabric cost", debitAmount: "0", creditAmount: String(fabricCost) },
          ]);
        }
      }
    }

    await tx.insert(tailorOrderStages).values({
      tailorOrderId: order.id,
      stage: "delivered",
      notes: `Delivered. Collected ${input.balanceCollected} on delivery.`,
      changedBy: input.changedBy,
    });

    const [updated] = await tx
      .update(tailorOrders)
      .set({
        status: "delivered",
        currentStage: "delivered",
        deliveredDate: input.deliveredDate,
        advancePaid: String(advancePaid + input.balanceCollected),
        balanceDue: String(balanceDue - input.balanceCollected),
        updatedAt: new Date(),
      })
      .where(eq(tailorOrders.id, order.id))
      .returning();

    return updated;
  });
}
