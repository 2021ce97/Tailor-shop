import Link from "next/link";
import { db, purchaseOrders, suppliers } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { canManagePurchaseOrders, requireSession } from "@/lib/auth/get-session";
import { notFound } from "next/navigation";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    received: "bg-emerald-50 text-emerald-700",
    ordered: "bg-amber-50 text-amber-700",
    draft: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-50 text-red-700",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}>{status}</span>;
}

export default async function PurchaseOrdersPage() {
  const session = await requireSession();
  if (!canManagePurchaseOrders(session)) notFound();

  const rows = await db
    .select({
      id: purchaseOrders.id,
      poNo: purchaseOrders.poNo,
      orderDate: purchaseOrders.orderDate,
      expectedDate: purchaseOrders.expectedDate,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .where(eq(purchaseOrders.branchId, session.branchId))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Purchase Orders — {session.branchName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Restock orders to suppliers, for both retail products and fabric.</p>
        </div>
        <Link href="/purchase-orders/new" className="text-sm rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">
          + New Purchase Order
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">PO No</th>
              <th className="px-4 py-2.5">Supplier</th>
              <th className="px-4 py-2.5">Order Date</th>
              <th className="px-4 py-2.5">Expected</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No purchase orders yet.
                </td>
              </tr>
            )}
            {rows.map((po) => (
              <tr key={po.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  <Link href={`/purchase-orders/${po.id}`} className="hover:underline">
                    {po.poNo}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{po.supplierName}</td>
                <td className="px-4 py-2.5 text-slate-600">{po.orderDate}</td>
                <td className="px-4 py-2.5 text-slate-600">{po.expectedDate ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{Number(po.totalAmount).toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={po.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
