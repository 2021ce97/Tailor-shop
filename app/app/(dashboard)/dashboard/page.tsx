import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { Scissors, Clock, PackageCheck } from "lucide-react";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await requireSession();
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));
  const [ordersInProgress] = await db.execute<{ [k: string]: unknown; count: string }>(
    sql`SELECT COUNT(*) AS count FROM tailor_orders WHERE status = 'in_progress'`
  );
  const [overdueCount] = await db.execute<{ [k: string]: unknown; count: string }>(
    sql`SELECT COUNT(*) AS count FROM overdue_orders_view`
  );
  const [readyCount] = await db.execute<{ [k: string]: unknown; count: string }>(
    sql`SELECT COUNT(*) AS count FROM tailor_orders WHERE current_stage = 'ready' AND status = 'in_progress'`
  );

  const cards = [
    { href: "/tailor-orders?filter=in_progress", label: t.ordersInProgress, value: String(ordersInProgress?.count ?? 0), hint: t.acrossAllStages, icon: Scissors },
    { href: "/tailor-orders?filter=overdue", label: t.overdueOrders, value: String(overdueCount?.count ?? 0), hint: t.pastPromisedDate, icon: Clock },
    { href: "/tailor-orders?filter=ready", label: t.readyForPickup, value: String(readyCount?.count ?? 0), hint: t.readyForPickupDescription, icon: PackageCheck },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">{t.dashboardTitle} — {session.branchName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t.dashboardDescription}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link href={c.href} key={c.label} className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">{c.label}</span>
                <Icon className="size-4 text-slate-400" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">{c.value}</div>
              <div className="text-xs text-slate-400 mt-1">{c.hint}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
