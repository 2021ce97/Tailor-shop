import Link from "next/link";
import { notFound } from "next/navigation";
import { db, purchaseOrders, purchaseOrderItems, suppliers, productVariants, products, fabrics } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ReceiveForm } from "./receive-form";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poId = Number(id);

  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
  if (!po) notFound();

  const [supplier, items] = await Promise.all([
    db.select().from(suppliers).where(eq(suppliers.id, po.supplierId)).then((r) => r[0]),
    db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, poId)),
  ]);

  // Resolve labels for variant/fabric lines
  const variantIds = items.filter((i) => i.variantId).map((i) => i.variantId!) as number[];
  const fabricIds = items.filter((i) => i.fabricId).map((i) => i.fabricId!) as number[];

  const [variantRows, fabricRows] = await Promise.all([
    variantIds.length
      ? db
          .select({ id: productVariants.id, sku: productVariants.sku, productName: products.name })
          .from(productVariants)
          .innerJoin(products, eq(products.id, productVariants.productId))
      : Promise.resolve([]),
    fabricIds.length ? db.select({ id: fabrics.id, name: fabrics.name }).from(fabrics) : Promise.resolve([]),
  ]);

  const lines = items.map((i) => {
    let label = i.description ?? "—";
    if (i.variantId) {
      const v = variantRows.find((r) => r.id === i.variantId);
      label = v ? `${v.productName} — ${v.sku}` : `Variant #${i.variantId}`;
    } else if (i.fabricId) {
      const f = fabricRows.find((r) => r.id === i.fabricId);
      label = f ? f.name : `Fabric #${i.fabricId}`;
    }
    return { id: i.id, label, quantity: Number(i.quantity), receivedQty: Number(i.receivedQty), unitCost: Number(i.unitCost) };
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/purchase-orders" className="text-xs text-slate-400 hover:text-slate-600">
          ← All purchase orders
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-lg font-semibold text-slate-900">{po.poNo}</h1>
          <span className="text-xs uppercase font-medium text-slate-400">{po.status}</span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          {supplier?.name} · Ordered {po.orderDate}
          {po.expectedDate ? ` · Expected ${po.expectedDate}` : ""}
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Item</th>
              <th className="px-4 py-2.5 text-right">Ordered</th>
              <th className="px-4 py-2.5 text-right">Received</th>
              <th className="px-4 py-2.5 text-right">Unit Cost</th>
              <th className="px-4 py-2.5 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 font-medium text-slate-900">{l.label}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{l.quantity}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{l.receivedQty}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{l.unitCost.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{(l.quantity * l.unitCost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td className="px-4 py-2.5" colSpan={4}>
                Total
              </td>
              <td className="px-4 py-2.5 text-right">{Number(po.totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {po.status !== "cancelled" && <ReceiveForm purchaseOrderId={po.id} lines={lines} />}
    </div>
  );
}
