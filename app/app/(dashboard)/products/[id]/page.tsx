import Link from "next/link";
import { notFound } from "next/navigation";
import { db, products, productVariants } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { VariantForm } from "./variant-form";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const session = await requireSession();

  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) notFound();

  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.branchId, session.branchId)));

  const allBranchVariants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/products" className="text-xs text-slate-400 hover:text-slate-600">
          ← All products
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 mt-1">{product.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {product.brand ? `${product.brand} · ` : ""}
          {product.gender} · Base price {Number(product.basePrice).toFixed(2)}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Showing variants for <span className="font-medium">{session.branchName}</span> only
          {allBranchVariants.length > variants.length && ` — this product also has variants in other branches`}.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">SKU</th>
              <th className="px-4 py-2.5">Size</th>
              <th className="px-4 py-2.5">Color</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {variants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No variants yet in this branch.
                </td>
              </tr>
            )}
            {variants.map((v) => {
              const low = v.stockQty <= v.reorderLevel;
              return (
                <tr key={v.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{v.sku}</td>
                  <td className="px-4 py-2.5 text-slate-600">{v.size ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{v.color ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-900">{Number(v.price ?? product.basePrice).toFixed(2)}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${low ? "text-red-600" : "text-slate-900"}`}>
                    {v.stockQty}
                    {low && " ⚠"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <VariantForm productId={productId} />
    </div>
  );
}
