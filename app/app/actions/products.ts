"use server";

import { z } from "zod";
import { db, products, productVariants, stockMovements } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  gender: z.enum(["men", "women", "kids", "unisex"]).optional(),
  basePrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).default(0),
  // First variant, created alongside the product — a shop can add more
  // size/color variants afterward from the product's own page.
  sku: z.string().min(1, "SKU is required"),
  size: z.string().optional(),
  color: z.string().optional(),
  barcode: z.string().optional(),
  stockQty: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(5),
});

export type ProductFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

export async function createProduct(_prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();

  try {
    await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          name: parsed.data.name,
          brand: parsed.data.brand || null,
          gender: parsed.data.gender || null,
          basePrice: String(parsed.data.basePrice),
          costPrice: String(parsed.data.costPrice),
        })
        .returning();

      const [variant] = await tx
        .insert(productVariants)
        .values({
          productId: product.id,
          branchId: session.branchId,
          sku: parsed.data.sku,
          size: parsed.data.size || null,
          color: parsed.data.color || null,
          barcode: parsed.data.barcode || null,
          price: String(parsed.data.basePrice),
          costPrice: String(parsed.data.costPrice),
          stockQty: parsed.data.stockQty,
          reorderLevel: parsed.data.reorderLevel,
        })
        .returning();

      if (parsed.data.stockQty > 0) {
        await tx.insert(stockMovements).values({
          variantId: variant.id,
          branchId: session.branchId,
          movementType: "adjustment",
          quantity: parsed.data.stockQty,
          referenceType: "manual",
          notes: "Opening stock",
          createdBy: session.userId,
        });
      }
    });

    revalidatePath("/products");
    return { status: "success", message: `Product "${parsed.data.name}" added.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to add product." };
  }
}

const variantSchema = z.object({
  productId: z.coerce.number().int().positive(),
  sku: z.string().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  barcode: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  stockQty: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(5),
});

export type VariantFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

export async function addVariant(_prevState: VariantFormState, formData: FormData): Promise<VariantFormState> {
  const parsed = variantSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();

  try {
    await db.transaction(async (tx) => {
      const [variant] = await tx
        .insert(productVariants)
        .values({
          productId: parsed.data.productId,
          branchId: session.branchId,
          sku: parsed.data.sku,
          size: parsed.data.size || null,
          color: parsed.data.color || null,
          barcode: parsed.data.barcode || null,
          price: parsed.data.price !== undefined ? String(parsed.data.price) : null,
          costPrice: parsed.data.costPrice !== undefined ? String(parsed.data.costPrice) : null,
          stockQty: parsed.data.stockQty,
          reorderLevel: parsed.data.reorderLevel,
        })
        .returning();

      if (parsed.data.stockQty > 0) {
        await tx.insert(stockMovements).values({
          variantId: variant.id,
          branchId: session.branchId,
          movementType: "adjustment",
          quantity: parsed.data.stockQty,
          referenceType: "manual",
          notes: "Opening stock",
          createdBy: session.userId,
        });
      }
    });

    revalidatePath(`/products/${parsed.data.productId}`);
    return { status: "success", message: "Variant added." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to add variant." };
  }
}
