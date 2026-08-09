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
    { href: "/tailor-orders?filter=in_progress", label: t.ordersInProgress, value: String(ordersInProgress?.count ?? 0), hint: t.acrossAllStages, icon: Scissors, className: "bg-[#e33a4b]" },
    { href: "/tailor-orders?filter=overdue", label: t.overdueOrders, value: String(overdueCount?.count ?? 0), hint: t.pastPromisedDate, icon: Clock, className: "bg-[#7043c4]" },
    { href: "/tailor-orders?filter=ready", label: t.readyForPickup, value: String(readyCount?.count ?? 0), hint: t.readyForPickupDescription, icon: PackageCheck, className: "bg-[#20a944]" },
  ];

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-sky-50 via-slate-50 to-indigo-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t.dashboardTitle} — {session.branchName}</h1>
        <p className="text-sm text-slate-600 mt-1">{t.dashboardDescription}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link href={c.href} key={c.label} className={`min-h-40 rounded-lg p-5 text-white shadow-sm hover:-translate-y-0.5 transition-transform ${c.className}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/85">{c.label}</span>
                <Icon className="size-5 text-white/80" />
              </div>
              <div className="mt-5 text-4xl font-semibold tracking-tight">{c.value}</div>
              <div className="mt-1 text-xs text-white/75">{c.hint}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
