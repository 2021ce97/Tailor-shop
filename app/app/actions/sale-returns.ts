"use server";

import { z } from "zod";
import { postSaleReturn } from "@/lib/accounting/post-sale-return";
import { requireSession } from "@/lib/auth/get-session";
import { db, sales, saleItems, productVariants, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ReturnableLine {
  saleItemId: number;
  label: string;
  quantity: number;
  returnedQty: number;
  unitPrice: number;
}

/**
 * Looks up a sale by its sale number and returns its line items with
 * how much of each is still returnable. Called directly from the
 * client (not as a form action) so the return form can populate its
 * line-item table as soon as staff enter/select a sale.
 */
export async function lookupSaleForReturn(saleNo: string): Promise<
  | { found: true; saleId: number; saleNo: string; saleDate: string; totalAmount: number; lines: ReturnableLine[] }
  | { found: false; message: string }
> {
  await requireSession();

  const [sale] = await db.select().from(sales).where(eq(sales.saleNo, saleNo.trim()));
  if (!sale) return { found: false, message: `No sale found with number "${saleNo}".` };

  const items = await db
    .select({
      id: saleItems.id,
      quantity: saleItems.quantity,
      returnedQty: saleItems.returnedQty,
      unitPrice: saleItems.unitPrice,
      sku: productVariants.sku,
      size: productVariants.size,
      color: productVariants.color,
      productName: products.name,
    })
    .from(saleItems)
    .innerJoin(productVariants, eq(productVariants.id, saleItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(saleItems.saleId, sale.id));

  return {
    found: true,
    saleId: sale.id,
    saleNo: sale.saleNo,
    saleDate: sale.saleDate,
    totalAmount: Number(sale.totalAmount),
    lines: items.map((i) => ({
      saleItemId: i.id,
      label: `${i.productName} — ${i.sku}${i.size || i.color ? ` (${[i.size, i.color].filter(Boolean).join("/")})` : ""}`,
      quantity: i.quantity,
      returnedQty: i.returnedQty,
      unitPrice: Number(i.unitPrice),
    })),
  };
}

const lineSchema = z.object({ saleItemId: z.number().int().positive(), quantity: z.number().positive() });

const returnSchema = z.object({
  returnNo: z.string().min(1, "Return number is required"),
  saleId: z.coerce.number().int().positive("Select a sale"),
  returnDate: z.string().min(1),
  reason: z.string().optional(),
  refundMethod: z.enum(["cash", "bank", "store_credit"]),
  newSaleId: z.coerce.number().int().positive().optional(),
  itemsJson: z.string(),
});

export type SaleReturnFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

export async function submitSaleReturn(_prevState: SaleReturnFormState, formData: FormData): Promise<SaleReturnFormState> {
  const parsed = returnSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let items;
  try {
    items = z.array(lineSchema).min(1, "Select at least one item to return").parse(JSON.parse(parsed.data.itemsJson));
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Invalid return items." };
  }

  const session = await requireSession();

  try {
    await postSaleReturn({
      returnNo: parsed.data.returnNo,
      saleId: parsed.data.saleId,
      branchId: session.branchId,
      returnDate: parsed.data.returnDate,
      reason: parsed.data.reason,
      refundMethod: parsed.data.refundMethod,
      newSaleId: parsed.data.newSaleId,
      items,
      processedBy: session.userId,
    });

    revalidatePath("/sale-returns");
    return { status: "success", message: `Return ${parsed.data.returnNo} processed.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to process return." };
  }
}
