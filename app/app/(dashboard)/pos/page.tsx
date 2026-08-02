import { db, customers, productVariants, products } from "@/lib/db";
import { eq, gt, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { PosForm } from "./pos-form";

export default async function PosPage() {
  const session = await requireSession();

  const [customerRows, variantRows] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(eq(customers.status, "active")),
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        size: productVariants.size,
        color: productVariants.color,
        price: productVariants.price,
        basePrice: products.basePrice,
        stockQty: productVariants.stockQty,
        productName: products.name,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(productVariants.status, "active"), gt(productVariants.stockQty, 0), eq(productVariants.branchId, session.branchId))),
  ]);

  const customerOptions = customerRows.map((c) => ({ value: c.id, label: c.name, sublabel: c.phone ?? undefined }));
  const variants = variantRows.map((v) => ({
    id: v.id,
    productName: v.productName,
    sku: v.sku,
    size: v.size,
    color: v.color,
    price: Number(v.price ?? v.basePrice),
    stockQty: v.stockQty,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Sale — {session.branchName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search for products by name or SKU, add to cart, and complete the sale.</p>
      </div>
      <PosForm customers={customerOptions} variants={variants} />
    </div>
  );
}
