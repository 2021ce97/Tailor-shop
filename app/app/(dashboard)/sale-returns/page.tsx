import { db, saleReturns, sales } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { SaleReturnForm } from "./sale-return-form";

export default async function SaleReturnsPage() {
  const session = await requireSession();

  const recentReturns = await db
    .select({
      id: saleReturns.id,
      returnNo: saleReturns.returnNo,
      returnDate: saleReturns.returnDate,
      refundAmount: saleReturns.refundAmount,
      refundMethod: saleReturns.refundMethod,
      reason: saleReturns.reason,
      saleNo: sales.saleNo,
    })
    .from(saleReturns)
    .innerJoin(sales, eq(sales.id, saleReturns.saleId))
    .where(eq(saleReturns.branchId, session.branchId))
    .orderBy(desc(saleReturns.createdAt))
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Returns &amp; Exchanges — {session.branchName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Look up a sale by its sale number, choose what's coming back, and process the refund. For an exchange, ring
          up the replacement item as a normal POS sale and optionally link it here.
        </p>
      </div>

      <SaleReturnForm />

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Recent Returns</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2.5">Return No</th>
                <th className="px-4 py-2.5">Against Sale</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Method</th>
                <th className="px-4 py-2.5 text-right">Refund</th>
              </tr>
            </thead>
            <tbody>
              {recentReturns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No returns processed yet.
                  </td>
                </tr>
              )}
              {recentReturns.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.returnNo}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.saleNo}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.returnDate}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.reason ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">{r.refundMethod?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5 text-right text-slate-900">{Number(r.refundAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
