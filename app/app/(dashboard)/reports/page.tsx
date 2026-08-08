import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";

interface PLRow { [key: string]: unknown; account_type: string; account_name: string; net_amount: string }
interface PipelineRow { [key: string]: unknown; current_stage: string; order_kind: string; order_count: number; total_balance_due: string }
interface OverdueRow { [key: string]: unknown; order_no: string; customer_name: string; garment_type: string; promised_date: string; days_overdue: number }

export default async function ReportsPage() {
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));
  const [plResult, pipelineResult, overdueResult] = await Promise.all([
    db.execute<PLRow>(sql`SELECT * FROM profit_loss_view ORDER BY account_type, account_name`),
    db.execute<PipelineRow>(sql`SELECT * FROM order_pipeline_view ORDER BY order_kind, current_stage`),
    db.execute<OverdueRow>(sql`SELECT * FROM overdue_orders_view ORDER BY days_overdue DESC LIMIT 20`),
  ]);

  const income = plResult.filter((r) => r.account_type === "income");
  const expense = plResult.filter((r) => r.account_type === "expense");
  const totalIncome = income.reduce((s, r) => s + Number(r.net_amount), 0);
  const totalExpense = expense.reduce((s, r) => s - Number(r.net_amount), 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{t.reportsPage}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t.reportsHelp}</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{t.profitLoss}</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-slate-50 border-b border-slate-200"><td className="px-4 py-2 font-semibold text-slate-700" colSpan={2}>{t.income}</td></tr>
              {income.length === 0 && <tr><td className="px-4 py-3 text-slate-400" colSpan={2}>{t.noIncome}</td></tr>}
              {income.map((r) => (
                <tr key={r.account_name} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-600 pl-8">{r.account_name}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{Number(r.net_amount).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 border-b border-slate-200"><td className="px-4 py-2 font-semibold text-slate-700" colSpan={2}>{t.expenses}</td></tr>
              {expense.length === 0 && <tr><td className="px-4 py-3 text-slate-400" colSpan={2}>{t.noExpenses}</td></tr>}
              {expense.map((r) => (
                <tr key={r.account_name} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-600 pl-8">{r.account_name}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{(-Number(r.net_amount)).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="px-4 py-2.5">{t.netProfit}</td>
                <td className={`px-4 py-2.5 text-right ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{netProfit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{t.orderPipeline}</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2.5">{t.kind}</th><th className="px-4 py-2.5">{t.stage}</th><th className="px-4 py-2.5 text-right">{t.orders}</th><th className="px-4 py-2.5 text-right">{t.balanceDue}</th>
              </tr>
            </thead>
            <tbody>
              {pipelineResult.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t.noOrdersProgress}</td></tr>}
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
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{t.overdue}</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2.5">{t.orderId}</th><th className="px-4 py-2.5">{t.customer}</th><th className="px-4 py-2.5">{t.garment}</th><th className="px-4 py-2.5">{t.promisedDate}</th><th className="px-4 py-2.5 text-right">{t.daysLate}</th>
              </tr>
            </thead>
            <tbody>
              {overdueResult.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t.noOverdue}</td></tr>}
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

    </div>
  );
}
