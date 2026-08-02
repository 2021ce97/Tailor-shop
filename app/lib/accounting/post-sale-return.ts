import { db, sales, saleItems, saleReturns, saleReturnItems, productVariants, stockMovements, transactions, transactionLines, chartOfAccounts } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Processes a return (or the return half of an exchange) against an
 * existing sale. Reverses both the income and the cost side of the
 * original sale, and puts the stock back:
 *
 *   Dr  Retail Sales Income (4000)         = refund subtotal
 *   Cr  Cash/Bank (refund) or Customer
 *       Advances (2100) (store credit)     = refund amount
 *   Dr  Retail Inventory (1200)            = cost of returned goods
 *   Cr  Cost of Goods Sold (5000)          = cost of returned goods
 *
 * For an exchange, this only handles the "customer gives something
 * back" half — ring up whatever they're taking instead as a normal
 * new POS sale, and optionally link it via newSaleId for record-
 * keeping (the two transactions stay independently balanced; there's
 * no special combined posting for the pair).
 */

export interface ReturnLineInput {
  saleItemId: number;
  quantity: number;
}

export interface PostSaleReturnInput {
  returnNo: string;
  saleId: number;
  branchId: number;
  returnDate: string;
  reason?: string;
  refundMethod: "cash" | "bank" | "store_credit";
  newSaleId?: number;
  items: ReturnLineInput[];
  processedBy: number;
}

export async function postSaleReturn(input: PostSaleReturnInput) {
  if (input.items.length === 0) {
    throw new Error("A return needs at least one item.");
  }

  const [sale] = await db.select().from(sales).where(eq(sales.id, input.saleId));
  if (!sale) throw new Error("Sale not found.");

  const itemIds = input.items.map((i) => i.saleItemId);
  const originalItems = await db.select().from(saleItems).where(inArray(saleItems.id, itemIds));

  for (const line of input.items) {
    const original = originalItems.find((i) => i.id === line.saleItemId);
    if (!original) throw new Error(`Sale item ${line.saleItemId} not found on this sale.`);
    if (original.saleId !== input.saleId) throw new Error(`Sale item ${line.saleItemId} doesn't belong to sale ${input.saleId}.`);
    const maxReturnable = original.quantity - original.returnedQty;
    if (line.quantity > maxReturnable) {
      throw new Error(`Cannot return ${line.quantity} — only ${maxReturnable} returnable on this line.`);
    }
  }

  const refundAmount = input.items.reduce((s, l) => {
    const original = originalItems.find((i) => i.id === l.saleItemId)!;
    return s + l.quantity * Number(original.unitPrice);
  }, 0);
  const costAmount = input.items.reduce((s, l) => {
    const original = originalItems.find((i) => i.id === l.saleItemId)!;
    return s + l.quantity * Number(original.unitCost);
  }, 0);

  return await db.transaction(async (tx) => {
    const [saleReturn] = await tx
      .insert(saleReturns)
      .values({
        returnNo: input.returnNo,
        saleId: input.saleId,
        branchId: input.branchId,
        returnDate: input.returnDate,
        reason: input.reason,
        refundAmount: String(refundAmount),
        refundMethod: input.refundMethod,
        newSaleId: input.newSaleId,
        processedBy: input.processedBy,
      })
      .returning();

    for (const line of input.items) {
      const original = originalItems.find((i) => i.id === line.saleItemId)!;

      await tx.insert(saleReturnItems).values({
        saleReturnId: saleReturn.id,
        saleItemId: original.id,
        quantity: line.quantity,
        unitPrice: original.unitPrice,
        lineTotal: String(line.quantity * Number(original.unitPrice)),
      });

      await tx.update(saleItems).set({ returnedQty: original.returnedQty + line.quantity }).where(eq(saleItems.id, original.id));

      const [variant] = await tx.select({ stockQty: productVariants.stockQty }).from(productVariants).where(eq(productVariants.id, original.variantId));
      if (variant) {
        await tx.update(productVariants).set({ stockQty: variant.stockQty + line.quantity, updatedAt: new Date() }).where(eq(productVariants.id, original.variantId));
      }

      await tx.insert(stockMovements).values({
        variantId: original.variantId,
        branchId: input.branchId,
        movementType: "return_in",
        quantity: line.quantity,
        referenceType: "sale_return",
        referenceId: saleReturn.id,
        notes: `Returned against sale ${sale.saleNo}`,
        createdBy: input.processedBy,
      });
    }

    // --- Accounting reversal ---
    const [incomeAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "4000"));
    const [cogsAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "5000"));
    const [inventoryAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "1200"));
    const refundAccountCode = input.refundMethod === "store_credit" ? "2100" : input.refundMethod === "bank" ? "1010" : "1000";
    const [refundAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, refundAccountCode));

    if (!incomeAccount || !cogsAccount || !inventoryAccount || !refundAccount) {
      throw new Error("Standard chart of accounts is missing. Run the initial_setup seed first.");
    }

    const lines: { accountId: number; debitAmount: number; creditAmount: number }[] = [
      { accountId: incomeAccount.id, debitAmount: refundAmount, creditAmount: 0 },
      { accountId: refundAccount.id, debitAmount: 0, creditAmount: refundAmount },
    ];
    if (costAmount > 0) {
      lines.push({ accountId: inventoryAccount.id, debitAmount: costAmount, creditAmount: 0 });
      lines.push({ accountId: cogsAccount.id, debitAmount: 0, creditAmount: costAmount });
    }

    const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Return posting does not balance: debit ${totalDebit} != credit ${totalCredit}.`);
    }

    const [txn] = await tx
      .insert(transactions)
      .values({
        txnNo: input.returnNo,
        txnType: "sale",
        txnDate: input.returnDate,
        branchId: input.branchId,
        referenceType: "sale_return",
        referenceId: saleReturn.id,
        customerId: sale.customerId,
        totalAmount: String(refundAmount),
        notes: `Return against sale ${sale.saleNo}`,
        status: "draft",
        createdBy: input.processedBy,
      })
      .returning();

    await tx.insert(transactionLines).values(
      lines.map((l) => ({
        transactionId: txn.id,
        accountId: l.accountId,
        description: `Return ${input.returnNo}`,
        debitAmount: String(l.debitAmount),
        creditAmount: String(l.creditAmount),
      }))
    );
    await tx.update(transactions).set({ status: "posted" }).where(eq(transactions.id, txn.id));

    return saleReturn;
  });
}
