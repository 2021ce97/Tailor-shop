import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

interface PLRow { [key: string]: unknown; account_type: string; account_name: string; net_amount: string }
interface PipelineRow { [key: string]: unknown; current_stage: string; order_kind: string; order_count: number; total_balance_due: string }
interface OverdueRow { [key: string]: unknown; order_no: string; customer_name: string; garment_type: string; promised_date: string; days_overdue: number }
interface WorkloadRow { [key: string]: unknown; staff_name: string; active_orders: number }
interface ProductSalesRow { [key: string]: unknown; product_name: string; sku: string; units_sold: number; revenue: string; gross_profit: string }

export default async function ReportsPage() {
  const [plResult, pipelineResult, overdueResult, workloadResult, productResult] = await Promise.all([
    db.execute<PLRow>(sql`SELECT * FROM profit_loss_view ORDER BY account_type, account_name`),
    db.execute<PipelineRow>(sql`SELECT * FROM order_pipeline_view ORDER BY order_kind, current_stage`),
    db.execute<OverdueRow>(sql`SELECT * FROM overdue_orders_view ORDER BY days_overdue DESC LIMIT 20`),
    db.execute<WorkloadRow>(sql`SELECT * FROM staff_workload_view ORDER BY active_orders DESC`),
    db.execute<ProductSalesRow>(sql`SELECT * FROM product_sales_view ORDER BY revenue DESC LIMIT 20`),
  ]);

  const income = plResult.filter((r) => r.account_type === "income");
  const expense = plResult.filter((r) => r.account_type === "expense");
  const totalIncome = income.reduce((s, r) => s + Number(r.net_amount), 0);
  const totalExpense = expense.reduce((s, r) => s - Number(r.net_amount), 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Profit &amp; loss, order pipeline, overdue orders, staff workload, and top-selling products.</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Profit &amp; Loss</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-slate-50 border-b border-slate-200"><td className="px-4 py-2 font-semibold text-slate-700" colSpan={2}>Income</td></tr>
              {income.length === 0 && <tr><td className="px-4 py-3 text-slate-400" colSpan={2}>No income posted yet.</td></tr>}
              {income.map((r) => (
                <tr key={r.account_name} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-600 pl-8">{r.account_name}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{Number(r.net_amount).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 border-b border-slate-200"><td className="px-4 py-2 font-semibold text-slate-700" colSpan={2}>Expenses</td></tr>
              {expense.length === 0 && <tr><td className="px-4 py-3 text-slate-400" colSpan={2}>No expenses posted yet.</td></tr>}
              {expense.map((r) => (
                <tr key={r.account_name} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-600 pl-8">{r.account_name}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{(-Number(r.net_amount)).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="px-4 py-2.5">Net Profit</td>
                <td className={`px-4 py-2.5 text-right ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{netProfit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Tailoring Order Pipeline</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2.5">Kind</th><th className="px-4 py-2.5">Stage</th><th className="px-4 py-2.5 text-right">Orders</th><th className="px-4 py-2.5 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {pipelineResult.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No orders in progress.</td></tr>}
              {pipelineResult.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 text-slate-600 capitalize">{r.order_kind}</td>
                  <td className="px-4 py-2.5 text-slate-900 capitalize">{r.current_stage.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.order_count}</td>
                  <td className="px-4 py-2.5 text-right text-slate-900">{Number(r.total_balance_due).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Overdue Orders</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5">Garment</th><th className="px-4 py-2.5">Promised</th><th className="px-4 py-2.5 text-right">Days Late</th>
              </tr>
            </thead>
            <tbody>
              {overdueResult.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nothing overdue. 🎉</td></tr>}
              {overdueResult.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.order_no}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.customer_name}</td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">{r.garment_type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.promised_date}</td>
                  <td className="px-4 py-2.5 text-right text-red-600 font-medium">{r.days_overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Staff Workload</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2.5">Staff</th><th className="px-4 py-2.5 text-right">Active Orders</th>
              </tr>
            </thead>
            <tbody>
              {workloadResult.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No tailor staff on file yet.</td></tr>}
              {workloadResult.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.staff_name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.active_orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Top-Selling Products</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2.5">Product</th><th className="px-4 py-2.5">SKU</th><th className="px-4 py-2.5 text-right">Units Sold</th><th className="px-4 py-2.5 text-right">Revenue</th><th className="px-4 py-2.5 text-right">Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {productResult.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No retail sales yet.</td></tr>}
              {productResult.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.product_name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.sku}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.units_sold}</td>
                  <td className="px-4 py-2.5 text-right text-slate-900">{Number(r.revenue).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600">{Number(r.gross_profit).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
