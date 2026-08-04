import {
  db,
  purchaseOrders,
  purchaseOrderItems,
  productVariants,
  fabrics,
  stockMovements,
  fabricMovements,
  transactions,
  transactionLines,
  chartOfAccounts,
} from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Purchase orders cover both retail variant restocking and fabric
 * restocking — a single PO can mix line types, since a shop often
 * orders both from the same fabric/garment wholesaler. Creating a PO
 * does not touch stock or accounts; only receiving does (see
 * receivePurchaseOrder below), which is what makes "ordered but not
 * yet arrived" a meaningful, trackable state.
 */

export interface PoLineInput {
  variantId?: number;
  fabricId?: number;
  description?: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderInput {
  poNo: string;
  supplierId: number;
  branchId: number;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  items: PoLineInput[];
  createdBy: number;
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  if (input.items.length === 0) {
    throw new Error("A purchase order needs at least one line item.");
  }
  for (const item of input.items) {
    if (!item.variantId && !item.fabricId && !item.description) {
      throw new Error("Each line needs a variant, a fabric, or a description.");
    }
  }

  const totalAmount = input.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  return await db.transaction(async (tx) => {
    const [po] = await tx
      .insert(purchaseOrders)
      .values({
        poNo: input.poNo,
        supplierId: input.supplierId,
        branchId: input.branchId,
        orderDate: input.orderDate,
        expectedDate: input.expectedDate,
        status: "ordered",
        totalAmount: String(totalAmount),
        notes: input.notes,
        createdBy: input.createdBy,
      })
      .returning();

    await tx.insert(purchaseOrderItems).values(
      input.items.map((i) => ({
        purchaseOrderId: po.id,
        variantId: i.variantId,
        fabricId: i.fabricId,
        description: i.description,
        quantity: String(i.quantity),
        unitCost: String(i.unitCost),
        lineTotal: String(i.quantity * i.unitCost),
      }))
    );

    return po;
  });
}

export interface ReceiveLineInput {
  poItemId: number;
  receiveQty: number; // how much to receive right now (may be less than the remaining quantity)
}

export interface ReceivePurchaseOrderInput {
  purchaseOrderId: number;
  branchId: number;
  lines: ReceiveLineInput[];
  receivedBy: number;
}

export interface RecordSupplierPaymentInput {
  purchaseOrderId: number;
  branchId: number;
  amount: number;
  paymentMethod: "cash" | "bank";
  paidBy: number;
  notes?: string;
}

export async function getPurchaseOrderOutstandingBalance(purchaseOrderId: number) {
  const rows = await db
    .select({ txnType: transactions.txnType, totalAmount: transactions.totalAmount })
    .from(transactions)
    .where(and(eq(transactions.referenceType, "purchase_order"), eq(transactions.referenceId, purchaseOrderId), eq(transactions.status, "posted")));

  const receivedTotal = rows.filter((row) => row.txnType === "purchase").reduce((sum, row) => sum + Number(row.totalAmount), 0);
  const paidTotal = rows.filter((row) => row.txnType === "supplier_payment").reduce((sum, row) => sum + Number(row.totalAmount), 0);

  return receivedTotal - paidTotal;
}

export async function recordSupplierPayment(input: RecordSupplierPaymentInput) {
  if (input.amount <= 0) throw new Error("Enter a payment amount greater than zero.");

  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId));
  if (!po) throw new Error("Purchase order not found.");

  const outstanding = await getPurchaseOrderOutstandingBalance(input.purchaseOrderId);
  if (input.amount > outstanding + 0.001) {
    throw new Error(`The payment amount exceeds the outstanding balance of ${outstanding.toFixed(2)}.`);
  }

  return await db.transaction(async (tx) => {
    const [payableAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "2000"));
    if (!payableAccount) throw new Error("Chart of accounts missing Accounts Payable (2000).");

    const cashAccountCode = input.paymentMethod === "bank" ? "1010" : "1000";
    const [cashAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, cashAccountCode));
    if (!cashAccount) throw new Error(`Chart of accounts missing ${cashAccountCode}.`);

    const [txn] = await tx
      .insert(transactions)
      .values({
        txnNo: `${po.poNo}-PAY-${Date.now()}`,
        txnType: "supplier_payment",
        txnDate: new Date().toISOString().slice(0, 10),
        branchId: input.branchId,
        referenceType: "purchase_order",
        referenceId: po.id,
        supplierId: po.supplierId,
        totalAmount: String(input.amount),
        notes: input.notes || `Supplier payment against PO ${po.poNo}`,
        status: "posted",
        createdBy: input.paidBy,
      })
      .returning();

    await tx.insert(transactionLines).values([
      {
        transactionId: txn.id,
        accountId: payableAccount.id,
        description: `Supplier payment for PO ${po.poNo}`,
        debitAmount: String(input.amount),
        creditAmount: "0",
      },
      {
        transactionId: txn.id,
        accountId: cashAccount.id,
        description: `Supplier payment for PO ${po.poNo}`,
        debitAmount: "0",
        creditAmount: String(input.amount),
      },
    ]);

    return txn;
  });
}

/**
 * Receives some or all of a PO's outstanding quantity. Stock updates
 * happen line by line; a single combined accounting entry covers the
 * whole batch:
 *
 *   Dr  Retail Inventory (1200) / Fabric Inventory (1210) = value received
 *   Cr  Accounts Payable (2000)                            = value received
 *
 * Paying the supplier later is a separate step (not built yet — see
 * the project overview for what's still open); this only records that
 * the shop now owes the supplier for what physically arrived.
 */
export async function receivePurchaseOrder(input: ReceivePurchaseOrderInput) {
  if (input.lines.length === 0 || input.lines.every((l) => l.receiveQty <= 0)) {
    throw new Error("Enter a quantity to receive for at least one line.");
  }

  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId));
  if (!po) throw new Error("Purchase order not found.");
  if (po.status === "cancelled") throw new Error("This purchase order was cancelled.");

  const itemIds = input.lines.map((l) => l.poItemId);
  const items = await db.select().from(purchaseOrderItems).where(inArray(purchaseOrderItems.id, itemIds));

  let retailValue = 0;
  let fabricValue = 0;

  for (const line of input.lines) {
    if (line.receiveQty <= 0) continue;
    const item = items.find((i) => i.id === line.poItemId);
    if (!item) throw new Error(`Line ${line.poItemId} not found on this purchase order.`);
    const remaining = Number(item.quantity) - Number(item.receivedQty);
    if (line.receiveQty > remaining + 0.001) {
      throw new Error(`Cannot receive ${line.receiveQty} — only ${remaining} remaining on this line.`);
    }
    const value = line.receiveQty * Number(item.unitCost);
    if (item.variantId) retailValue += value;
    if (item.fabricId) fabricValue += value;
  }

  return await db.transaction(async (tx) => {
    for (const line of input.lines) {
      if (line.receiveQty <= 0) continue;
      const item = items.find((i) => i.id === line.poItemId)!;

      await tx
        .update(purchaseOrderItems)
        .set({ receivedQty: String(Number(item.receivedQty) + line.receiveQty) })
        .where(eq(purchaseOrderItems.id, item.id));

      if (item.variantId) {
        const [variant] = await tx.select({ stockQty: productVariants.stockQty }).from(productVariants).where(eq(productVariants.id, item.variantId));
        if (variant) {
          await tx
            .update(productVariants)
            .set({ stockQty: variant.stockQty + Math.round(line.receiveQty), updatedAt: new Date() })
            .where(eq(productVariants.id, item.variantId));
        }
        await tx.insert(stockMovements).values({
          variantId: item.variantId,
          branchId: input.branchId,
          movementType: "purchase_in",
          quantity: Math.round(line.receiveQty),
          referenceType: "purchase_order",
          referenceId: po.id,
          notes: `Received against PO ${po.poNo}`,
          createdBy: input.receivedBy,
        });
      }

      if (item.fabricId) {
        const [fabric] = await tx.select({ stockQty: fabrics.stockQty }).from(fabrics).where(eq(fabrics.id, item.fabricId));
        if (fabric) {
          await tx
            .update(fabrics)
            .set({ stockQty: String(Number(fabric.stockQty) + line.receiveQty), updatedAt: new Date() })
            .where(eq(fabrics.id, item.fabricId));
        }
        await tx.insert(fabricMovements).values({
          fabricId: item.fabricId,
          branchId: input.branchId,
          movementType: "purchase_in",
          quantity: String(line.receiveQty),
          referenceType: "purchase_order",
          referenceId: po.id,
          notes: `Received against PO ${po.poNo}`,
          createdBy: input.receivedBy,
        });
      }
    }

    // Post the combined accounting entry for whatever value was received.
    const totalValue = retailValue + fabricValue;
    if (totalValue > 0) {
      const [payableAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "2000"));
      if (!payableAccount) throw new Error("Chart of accounts missing Accounts Payable (2000).");

      const lines: { accountId: number; debitAmount: number; creditAmount: number }[] = [];

      if (retailValue > 0) {
        const [retailInvAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "1200"));
        if (!retailInvAccount) throw new Error("Chart of accounts missing Retail Inventory (1200).");
        lines.push({ accountId: retailInvAccount.id, debitAmount: retailValue, creditAmount: 0 });
      }
      if (fabricValue > 0) {
        const [fabricInvAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "1210"));
        if (!fabricInvAccount) throw new Error("Chart of accounts missing Fabric Inventory (1210).");
        lines.push({ accountId: fabricInvAccount.id, debitAmount: fabricValue, creditAmount: 0 });
      }
      lines.push({ accountId: payableAccount.id, debitAmount: 0, creditAmount: totalValue });

      const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
      const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Receiving posting does not balance: debit ${totalDebit} != credit ${totalCredit}.`);
      }

      const [txn] = await tx
        .insert(transactions)
        .values({
          txnNo: `${po.poNo}-RCV-${Date.now()}`,
          txnType: "purchase",
          txnDate: new Date().toISOString().slice(0, 10),
          branchId: input.branchId,
          referenceType: "purchase_order",
          referenceId: po.id,
          supplierId: po.supplierId,
          totalAmount: String(totalValue),
          notes: `Received against PO ${po.poNo}`,
          status: "draft",
          createdBy: input.receivedBy,
        })
        .returning();

      await tx.insert(transactionLines).values(
        lines.map((l) => ({
          transactionId: txn.id,
          accountId: l.accountId,
          description: `PO ${po.poNo} receiving`,
          debitAmount: String(l.debitAmount),
          creditAmount: String(l.creditAmount),
        }))
      );
      await tx.update(transactions).set({ status: "posted" }).where(eq(transactions.id, txn.id));
    }

    // Recompute PO status: fully received once every line's
    // receivedQty reaches its ordered quantity.
    const refreshedItems = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));
    const fullyReceived = refreshedItems.every((i) => Number(i.receivedQty) >= Number(i.quantity) - 0.001);

    const [updated] = await tx
      .update(purchaseOrders)
      .set({ status: fullyReceived ? "received" : "ordered", updatedAt: new Date() })
      .where(eq(purchaseOrders.id, po.id))
      .returning();

    return updated;
  });
}
