import { db, customers, tailorOrderItems, tailorOrders } from "@/lib/db";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, DollarSign, WalletCards } from "lucide-react";

interface PLRow { [key: string]: unknown; account_type: string; account_name: string; net_amount: string }
interface PipelineRow { [key: string]: unknown; current_stage: string; order_kind: string; order_count: number; total_balance_due: string }
interface OverdueRow { [key: string]: unknown; order_no: string; customer_name: string; garment_type: string; promised_date: string; days_overdue: number }

interface ReportsPageProps {
  searchParams: Promise<{ query?: string; status?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));
  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const statusFilter = params.status?.trim() ?? "";

  const [plResult, pipelineResult, overdueResult, searchResult] = await Promise.all([
    db.execute<PLRow>(sql`SELECT * FROM profit_loss_view ORDER BY account_type, account_name`),
    db.execute<PipelineRow>(sql`SELECT * FROM order_pipeline_view ORDER BY order_kind, current_stage`),
    db.execute<OverdueRow>(sql`SELECT * FROM overdue_orders_view ORDER BY days_overdue DESC LIMIT 20`),
    query
      ? db
          .select({
            orderNo: tailorOrders.orderNo,
            customerName: customers.name,
            customerPhone: customers.phone,
            customerCode: customers.customerCode,
            ticketNo: tailorOrderItems.ticketNo,
            stage: tailorOrderItems.currentStage,
            balanceDue: tailorOrders.balanceDue,
            promisedDate: tailorOrders.promisedDate,
            status: tailorOrders.status,
          })
          .from(tailorOrderItems)
          .innerJoin(tailorOrders, eq(tailorOrders.id, tailorOrderItems.tailorOrderId))
          .innerJoin(customers, eq(customers.id, tailorOrders.customerId))
          .where(
            or(
              ilike(tailorOrders.orderNo, `%${query}%`),
              ilike(tailorOrderItems.ticketNo, `%${query}%`),
              ilike(customers.name, `%${query}%`),
              ilike(customers.phone, `%${query}%`),
              ilike(customers.customerCode, `%${query}%`)
            )
          )
          .orderBy(desc(tailorOrders.orderDate))
      : Promise.resolve([]),
  ]);

  const income = plResult.filter((r) => r.account_type === "income");
  const expense = plResult.filter((r) => r.account_type === "expense");
  const totalIncome = income.reduce((s, r) => s + Number(r.net_amount), 0);
  const totalExpense = expense.reduce((s, r) => s - Number(r.net_amount), 0);
  const netProfit = totalIncome - totalExpense;
  const pipelineOrderCount = pipelineResult.reduce((sum, row) => sum + Number(row.order_count), 0);
  const overdueOrderCount = overdueResult.length;
  const readyOrderCount = pipelineResult.filter((row) => row.current_stage === "ready").reduce((sum, row) => sum + Number(row.order_count), 0);
  const filteredSearch = statusFilter ? searchResult.filter((row) => row.status === statusFilter) : searchResult;

  const summaryCards = [
    { label: t.income, value: totalIncome.toFixed(2), hint: t.profitLoss, icon: DollarSign, className: "bg-[#e33a4b] text-white" },
    { label: t.expenses, value: totalExpense.toFixed(2), hint: t.expenses, icon: WalletCards, className: "bg-[#10bddd] text-white" },
    { label: t.netProfit, value: netProfit.toFixed(2), hint: t.profitLoss, icon: BarChart3, className: "bg-[#ef16b5] text-white" },
    { label: t.ordersInProgress, value: String(pipelineOrderCount), hint: t.orderPipeline, icon: Clock3, className: "bg-[#20a944] text-white" },
    { label: t.readyForPickup, value: String(readyOrderCount), hint: t.readyForPickupDescription, icon: CheckCircle2, className: "bg-[#138b5d] text-white" },
    { label: t.overdue, value: String(overdueOrderCount), hint: t.daysLate, icon: AlertTriangle, className: "bg-[#7043c4] text-white" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{t.reportsPage}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.reportsHelp}</p>
      </div>

      <section aria-label={t.reportsPage} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`min-h-36 rounded-lg p-4 shadow-sm ${card.className}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium leading-5 text-white/85">{card.label}</span>
                <Icon className="size-5 shrink-0 text-white/80" aria-hidden="true" />
              </div>
              <div className="mt-5 truncate text-2xl font-semibold tracking-tight">{card.value}</div>
              <div className="mt-1 truncate text-xs text-white/75">{card.hint}</div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Order and garment search</h2>
            <p className="mt-1 text-sm text-slate-500">Search by order number, garment ticket, customer name, phone, or customer ID.</p>
          </div>
          <form className="flex flex-wrap gap-2" method="get">
            <input name="query" defaultValue={query} placeholder="Search" className="min-w-[220px] rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select name="status" defaultValue={statusFilter} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="in_progress">In progress</option>
              <option value="delivered">Delivered</option>
            </select>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">Search</button>
          </form>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Ticket</th>
                <th className="px-4 py-2.5">Stage</th>
                <th className="px-4 py-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredSearch.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">{query ? "No matching orders found." : "Use the search box to find garments and orders."}</td>
                </tr>
              )}
              {filteredSearch.map((row) => (
                <tr key={`${row.orderNo}-${row.ticketNo}`} className="border-t border-slate-200">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{row.orderNo}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    <div>{row.customerName}</div>
                    <div className="text-xs text-slate-400">{row.customerPhone ?? "—"} · {row.customerCode ?? "—"}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{row.ticketNo}</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.stage.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5 text-right text-slate-900">{Number(row.balanceDue ?? 0).toFixed(2)} AFN</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{t.profitLoss}</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50"><td className="px-4 py-2 font-semibold text-slate-700" colSpan={2}>{t.income}</td></tr>
              {income.length === 0 && <tr><td className="px-4 py-3 text-slate-400" colSpan={2}>{t.noIncome}</td></tr>}
              {income.map((r) => (
                <tr key={r.account_name} className="border-b border-slate-100">
                  <td className="px-4 py-2 pl-8 text-slate-600">{r.account_name}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{Number(r.net_amount).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-b border-slate-200 bg-slate-50"><td className="px-4 py-2 font-semibold text-slate-700" colSpan={2}>{t.expenses}</td></tr>
              {expense.length === 0 && <tr><td className="px-4 py-3 text-slate-400" colSpan={2}>{t.noExpenses}</td></tr>}
              {expense.map((r) => (
                <tr key={r.account_name} className="border-b border-slate-100">
                  <td className="px-4 py-2 pl-8 text-slate-600">{r.account_name}</td>
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                  <td className="px-4 py-2.5 capitalize text-slate-600">{r.order_kind}</td>
                  <td className="px-4 py-2.5 capitalize text-slate-900">{r.current_stage.replace(/_/g, " ")}</td>
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                  <td className="px-4 py-2.5 capitalize text-slate-600">{r.garment_type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.promised_date}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-red-600">{r.days_overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
