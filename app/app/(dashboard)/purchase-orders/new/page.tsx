import { db, suppliers, productVariants, products, fabrics } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { canManagePurchaseOrders, requireSession } from "@/lib/auth/get-session";
import { notFound } from "next/navigation";
import { PurchaseOrderForm } from "./purchase-order-form";

export default async function NewPurchaseOrderPage() {
  const session = await requireSession();
  if (!canManagePurchaseOrders(session)) notFound();

  const [supplierRows, variantRows, fabricRows] = await Promise.all([
    db.select({ id: suppliers.id, name: suppliers.name, type: suppliers.type }).from(suppliers).where(eq(suppliers.status, "active")),
    db
      .select({ id: productVariants.id, sku: productVariants.sku, productName: products.name })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(productVariants.status, "active"), eq(productVariants.branchId, session.branchId))),
    db.select({ id: fabrics.id, name: fabrics.name, color: fabrics.color }).from(fabrics).where(and(eq(fabrics.status, "active"), eq(fabrics.branchId, session.branchId))),
  ]);

  const supplierOptions = supplierRows.map((s) => ({ value: s.id, label: s.name, sublabel: s.type ?? undefined }));
  const variantOptions = variantRows.map((v) => ({ value: v.id, label: `${v.productName} — ${v.sku}` }));
  const fabricOptions = fabricRows.map((f) => ({ value: f.id, label: `${f.name}${f.color ? ` (${f.color})` : ""}` }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Purchase Order — {session.branchName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Creating a PO doesn&apos;t touch stock yet — stock and accounting entries are posted when you receive it.
        </p>
      </div>
      <PurchaseOrderForm suppliers={supplierOptions} variants={variantOptions} fabrics={fabricOptions} />
    </div>
  );
}
