import Link from "next/link";
import { db, customers, measurementProfiles, tailorOrders, sales } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MeasurementForm } from "./measurement-form";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) notFound();

  const [profiles, orders, saleRows] = await Promise.all([
    db.select().from(measurementProfiles).where(eq(measurementProfiles.customerId, customerId)).orderBy(desc(measurementProfiles.createdAt)),
    db.select().from(tailorOrders).where(eq(tailorOrders.customerId, customerId)).orderBy(desc(tailorOrders.createdAt)).limit(20),
    db.select().from(sales).where(eq(sales.customerId, customerId)).orderBy(desc(sales.createdAt)).limit(20),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/customers" className="text-xs text-slate-400 hover:text-slate-600">
          ← All customers
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 mt-1">{customer.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact info on file"}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Measurement Profiles</h2>
        <div className="grid grid-cols-1 gap-3 mb-4">
          {profiles.length === 0 && (
            <p className="text-sm text-slate-400 bg-white border border-slate-200 rounded-lg px-4 py-6 text-center">
              No measurement profiles yet.
            </p>
          )}
          {profiles.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900 capitalize">
                  {p.garmentType} {p.label ? `— ${p.label}` : ""}
                </span>
                <span className="text-xs text-slate-400">{p.takenAt}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {Object.entries(p.measurements as Record<string, string>).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-slate-400 capitalize">{k.replace(/_/g, " ")}</div>
                    <div className="font-medium text-slate-900">{v || "—"}</div>
                  </div>
                ))}
              </div>
              {p.notes && <p className="text-xs text-slate-500 mt-2">{p.notes}</p>}
            </div>
          ))}
        </div>
        <MeasurementForm customerId={customerId} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Tailor Orders</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2">Order No</th>
                <th className="px-4 py-2">Garment</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2 text-right">Balance Due</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No tailor orders yet.
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <Link href={`/tailor-orders/${o.id}`} className="hover:underline">
                      {o.orderNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 capitalize">{o.garmentType}</td>
                  <td className="px-4 py-2 text-slate-600 capitalize">{o.currentStage.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{Number(o.balanceDue).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <a href={`/api/tailor-orders/${o.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-900 underline">
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Retail Purchases</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2">Sale No</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {saleRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No retail purchases yet.
                  </td>
                </tr>
              )}
              {saleRows.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">{s.saleNo}</td>
                  <td className="px-4 py-2 text-slate-600">{s.saleDate}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{Number(s.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <a href={`/api/sales/${s.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-900 underline">
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
