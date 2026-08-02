"use server";

import { z } from "zod";
import { postRetailSale } from "@/lib/accounting/post-retail-sale";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const cartItemSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
});

const saleSchema = z.object({
  saleNo: z.string().min(1, "Sale number is required"),
  saleDate: z.string().min(1),
  customerId: z.coerce.number().int().positive().optional(),
  itemsJson: z.string(),
  discount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0),
  paymentMethod: z.enum(["cash", "card", "bank_transfer"]),
});

export type PosFormState = { status: "idle" | "success" | "error"; message?: string; saleId?: number };

export async function submitPosSale(_prevState: PosFormState, formData: FormData): Promise<PosFormState> {
  const parsed = saleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please check the sale details." };
  }

  let items;
  try {
    items = z.array(cartItemSchema).min(1, "Add at least one item to the cart").parse(JSON.parse(parsed.data.itemsJson));
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Invalid cart." };
  }

  const session = await requireSession();

  try {
    const sale = await postRetailSale({
      saleNo: parsed.data.saleNo,
      saleDate: parsed.data.saleDate,
      branchId: session.branchId,
      customerId: parsed.data.customerId,
      items,
      discount: parsed.data.discount,
      taxAmount: parsed.data.taxAmount,
      amountPaid: parsed.data.amountPaid,
      paymentMethod: parsed.data.paymentMethod,
      cashierId: session.userId,
    });

    revalidatePath("/inventory");
    return { status: "success", message: `Sale ${sale.saleNo} completed.`, saleId: sale.id };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to complete sale." };
  }
}
