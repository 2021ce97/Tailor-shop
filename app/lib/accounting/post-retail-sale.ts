import { db, sales, saleItems, productVariants, stockMovements, transactions, transactionLines, chartOfAccounts } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Posts a completed POS sale: deducts stock for every line, then posts
 * balanced accounting entries. Unlike tailor orders (where income is
 * deferred to delivery), a retail sale is a complete transaction on
 * the spot — cash changes hands and goods leave the shelf in the same
 * moment — so everything posts immediately.
 *
 *   Dr  Cash/Bank                   = amount received
 *   Cr  Retail Sales Income (4000)  = subtotal - discount + tax
 *       (tax isn't split into its own payable account in this system —
 *       fine for a single small shop; add a Tax Payable account and
 *       split this line if the shop needs to remit sales tax separately)
 *   Dr  Cost of Goods Sold (5000)   = sum(unit_cost * qty)
 *   Cr  Retail Inventory (1200)     = sum(unit_cost * qty)
 *
 * Every line is checked against live stock before any writes happen,
 * so a sale either fully succeeds or doesn't touch the database at all.
 */

export interface SaleLineInput {
  variantId: number;
  quantity: number;
  unitPrice: number;
}

export interface PostRetailSaleInput {
  saleNo: string;
  saleDate: string;
  branchId: number;
  customerId?: number;
  items: SaleLineInput[];
  discount: number;
  taxAmount: number;
  amountPaid: number;
  paymentMethod: "cash" | "card" | "bank_transfer";
  cashierId: number;
}

export async function postRetailSale(input: PostRetailSaleInput) {
  if (input.items.length === 0) {
    throw new Error("A sale needs at least one item.");
  }

  const variantIds = input.items.map((i) => i.variantId);
  const neededVariants = await db.select().from(productVariants).where(inArray(productVariants.id, variantIds));

  for (const item of input.items) {
    const variant = neededVariants.find((v) => v.id === item.variantId);
    if (!variant) throw new Error(`Variant ${item.variantId} not found.`);
    if (variant.branchId !== input.branchId) {
      throw new Error(`Variant ${variant.sku} belongs to a different branch than this sale.`);
    }
    if (variant.stockQty < item.quantity) {
      throw new Error(`Not enough stock for SKU ${variant.sku}: have ${variant.stockQty}, need ${item.quantity}.`);
    }
  }

  const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalAmount = subtotal - input.discount + input.taxAmount;
  const totalCost = input.items.reduce((s, i) => {
    const variant = neededVariants.find((v) => v.id === i.variantId)!;
    return s + i.quantity * Number(variant.costPrice ?? 0);
  }, 0);

  return await db.transaction(async (tx) => {
    const [sale] = await tx
      .insert(sales)
      .values({
        saleNo: input.saleNo,
        customerId: input.customerId,
        branchId: input.branchId,
        saleDate: input.saleDate,
        subtotal: String(subtotal),
        discount: String(input.discount),
        taxAmount: String(input.taxAmount),
        totalAmount: String(totalAmount),
        amountPaid: String(input.amountPaid),
        paymentMethod: input.paymentMethod,
        status: "completed",
        cashierId: input.cashierId,
      })
      .returning();

    for (const item of input.items) {
      const variant = neededVariants.find((v) => v.id === item.variantId)!;
      await tx.insert(saleItems).values({
        saleId: sale.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        unitCost: String(variant.costPrice ?? 0),
        lineTotal: String(item.quantity * item.unitPrice),
      });

      await tx
        .update(productVariants)
        .set({ stockQty: variant.stockQty - item.quantity, updatedAt: new Date() })
        .where(eq(productVariants.id, item.variantId));

      await tx.insert(stockMovements).values({
        variantId: item.variantId,
        branchId: input.branchId,
        movementType: "sale_out",
        quantity: -item.quantity,
        referenceType: "sale",
        referenceId: sale.id,
        createdBy: input.cashierId,
      });
    }

    // --- Accounting postings ---
    const cashAccountCode = input.paymentMethod === "card" || input.paymentMethod === "bank_transfer" ? "1010" : "1000";
    const [cashAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, cashAccountCode));
    const [incomeAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "4000"));
    const [cogsAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "5000"));
    const [inventoryAccount] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, "1200"));

    if (!cashAccount || !incomeAccount || !cogsAccount || !inventoryAccount) {
      throw new Error("Standard chart of accounts is missing (1000/1010, 4000, 5000, 1200). Run the initial_setup seed first.");
    }

    const [txn] = await tx
      .insert(transactions)
      .values({
        txnNo: input.saleNo,
        txnType: "sale",
        txnDate: input.saleDate,
        branchId: input.branchId,
        referenceType: "sale",
        referenceId: sale.id,
        customerId: input.customerId,
        totalAmount: String(totalAmount),
        notes: `POS sale ${input.saleNo}`,
        status: "draft",
        createdBy: input.cashierId,
      })
      .returning();

    const lines = [
      { accountId: cashAccount.id, debitAmount: input.amountPaid, creditAmount: 0 },
      { accountId: incomeAccount.id, debitAmount: 0, creditAmount: totalAmount },
      ...(totalCost > 0
        ? [
            { accountId: cogsAccount.id, debitAmount: totalCost, creditAmount: 0 },
            { accountId: inventoryAccount.id, debitAmount: 0, creditAmount: totalCost },
          ]
        : []),
    ];

    const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Sale posting does not balance: debit ${totalDebit} != credit ${totalCredit}. This means amountPaid didn't match totalAmount — for a cash sale they should be equal.`
      );
    }

    await tx.insert(transactionLines).values(
      lines.map((l) => ({
        transactionId: txn.id,
        accountId: l.accountId,
        description: `Sale ${input.saleNo}`,
        debitAmount: String(l.debitAmount),
        creditAmount: String(l.creditAmount),
      }))
    );
    await tx.update(transactions).set({ status: "posted" }).where(eq(transactions.id, txn.id));

    return sale;
  });
}
