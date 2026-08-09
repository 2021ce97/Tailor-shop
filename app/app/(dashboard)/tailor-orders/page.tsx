import Link from "next/link";
import { db, tailorOrders, customers } from "@/lib/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";

const stageLabels: Record<string, string> = {
  measurement: "Measurement",
  fabric_selected: "Fabric Selected",
  cutting: "Cutting",
  stitching: "Stitching",
  fitting: "Fitting",
  finishing: "Finishing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const stageColors: Record<string, string> = {
  measurement: "bg-slate-100 text-slate-600",
  fabric_selected: "bg-slate-100 text-slate-600",
  cutting: "bg-amber-50 text-amber-700",
  stitching: "bg-amber-50 text-amber-700",
  fitting: "bg-blue-50 text-blue-700",
  finishing: "bg-blue-50 text-blue-700",
  ready: "bg-emerald-50 text-emerald-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default async function TailorOrdersPage({ searchParams }: { searchParams?: Promise<{ filter?: string }> }) {
  const session = await requireSession();
  const filter = (await searchParams)?.filter;
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));
  const rows = await db
    .select({
      id: tailorOrders.id,
      orderNo: tailorOrders.orderNo,
      orderKind: tailorOrders.orderKind,
      garmentType: tailorOrders.garmentType,
      currentStage: tailorOrders.currentStage,
      status: tailorOrders.status,
      promisedDate: tailorOrders.promisedDate,
      totalAmount: tailorOrders.totalAmount,
      balanceDue: tailorOrders.balanceDue,
      customerName: customers.name,
    })
    .from(tailorOrders)
    .leftJoin(customers, eq(customers.id, tailorOrders.customerId))
    .where(and(
      eq(tailorOrders.branchId, session.branchId),
      filter === "ready" ? eq(tailorOrders.currentStage, "ready") :
      filter === "in_progress" ? eq(tailorOrders.status, "in_progress") :
      filter === "overdue" ? sql`${tailorOrders.promisedDate} < CURRENT_DATE AND ${tailorOrders.status} = 'in_progress'` : undefined,
    ))
    .orderBy(desc(tailorOrders.createdAt))
    .limit(100);

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t.allOrders} — {session.branchName}</h1>
          <p className="text-sm text-slate-600 mt-1">{filter === "ready" ? t.readyForPickupDescription : filter === "overdue" ? t.pastPromisedDate : t.noOrders}</p>
        </div>
        <Link href="/tailor-orders/new" className="text-sm rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">
          + {t.newOrder}
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">{t.orderId}</th><th className="px-4 py-2.5">{t.customer}</th><th className="px-4 py-2.5">{t.kind}</th><th className="px-4 py-2.5">{t.garment}</th><th className="px-4 py-2.5">{t.promisedDate}</th><th className="px-4 py-2.5">{t.stage}</th><th className="px-4 py-2.5 text-right">{t.total}</th><th className="px-4 py-2.5 text-right">{t.balanceDue}</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  {t.noOrders}
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  <Link href={`/tailor-orders/${o.id}`} className="hover:underline">
                    {o.orderNo}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{o.customerName ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{o.orderKind}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{o.garmentType}</td>
                <td className="px-4 py-2.5 text-slate-600">{o.promisedDate ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[o.currentStage] ?? "bg-slate-100 text-slate-600"}`}>
                    {stageLabels[o.currentStage] ?? o.currentStage}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-900">{Number(o.totalAmount).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-900">{Number(o.balanceDue).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right">
                  <a href={`/api/tailor-orders/${o.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-900 underline">
                    {t.pdf}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
