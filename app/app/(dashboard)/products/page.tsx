import Link from "next/link";
import { db, products, productVariants } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { ProductForm } from "./product-form";

export default async function ProductsPage() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      gender: products.gender,
      basePrice: products.basePrice,
      variantCount: sql<number>`count(${productVariants.id})`,
      totalStock: sql<number>`coalesce(sum(${productVariants.stockQty}), 0)`,
    })
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .groupBy(products.id)
    .orderBy(desc(products.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Products</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ready-made garments sold at retail. Click a product to manage its size/color variants.</p>
      </div>

      <ProductForm />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Brand</th>
              <th className="px-4 py-2.5">Gender</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">Variants</th>
              <th className="px-4 py-2.5 text-right">Total Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No products yet.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/products/${p.id}`} className="font-medium text-slate-900 hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{p.brand ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{p.gender ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{Number(p.basePrice).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{p.variantCount}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{p.totalStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
