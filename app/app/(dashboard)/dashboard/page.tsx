import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { ShoppingCart, Scissors, AlertTriangle, Clock } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireSession();
  const branchId = session.branchId;

  const [salesToday] = await db.execute<{ [k: string]: unknown; count: string; total: string }>(
    sql`SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total FROM sales WHERE sale_date = CURRENT_DATE AND status = 'completed' AND branch_id = ${branchId}`
  );
  const [ordersInProgress] = await db.execute<{ [k: string]: unknown; count: string }>(
    sql`SELECT COUNT(*) AS count FROM tailor_orders WHERE status = 'in_progress' AND branch_id = ${branchId}`
  );
  const [lowStockCount] = await db.execute<{ [k: string]: unknown; count: string }>(
    sql`SELECT COUNT(*) AS count FROM low_stock_view WHERE branch_id = ${branchId}`
  );
  const [overdueCount] = await db.execute<{ [k: string]: unknown; count: string }>(
    sql`SELECT COUNT(*) AS count FROM overdue_orders_view WHERE branch_id = ${branchId}`
  );

  const cards = [
    { label: "Today's Retail Sales", value: `${Number(salesToday?.total ?? 0).toFixed(2)}`, hint: `${salesToday?.count ?? 0} sale(s)`, icon: ShoppingCart },
    { label: "Tailor Orders In Progress", value: String(ordersInProgress?.count ?? 0), hint: "across all stages", icon: Scissors },
    { label: "Low Stock Alerts", value: String(lowStockCount?.count ?? 0), hint: "variants + fabric", icon: AlertTriangle },
    { label: "Overdue Orders", value: String(overdueCount?.count ?? 0), hint: "past promised date", icon: Clock },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Dashboard — {session.branchName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">A quick look at today's retail activity and the tailoring pipeline.</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">{c.label}</span>
                <Icon className="size-4 text-slate-400" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">{c.value}</div>
              <div className="text-xs text-slate-400 mt-1">{c.hint}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
