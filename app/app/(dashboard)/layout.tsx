import Link from "next/link";
import {
  LayoutDashboard,
  Scissors,
  Ruler,
  Users,
  Truck,
  BookOpen,
  Scale,
  TrendingUp,
  Settings,
  LogOut,
  WalletCards,
} from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { logout } from "@/app/actions/auth";
import { db, shopSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const t = getTranslations(locale);

  const [shop] = await db.select({ shopName: shopSettings.shopName }).from(shopSettings).where(eq(shopSettings.id, 1));

  const localizedNav = [
    {
      section: t.mainPages,
      items: [
        { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
        { href: "/tailor-orders/new", label: t.newOrder, icon: Scissors },
        { href: "/tailor-orders", label: t.ordersReport, icon: TrendingUp },
        { href: "/settings", label: "Setting & Garment Configuration", icon: Settings },
      ],
    },
    {
      section: t.operations,
      items: [
        { href: "/cabinet", label: t.cabinet, icon: WalletCards },
        { href: "/accounts", label: t.accounts, icon: BookOpen },
        { href: "/fabrics", label: t.fabricInventory, icon: Ruler },
        { href: "/stitching-cutting", label: t.stitchingAndCutting, icon: Scissors },
        { href: "/delivery", label: t.submitToClient, icon: Truck },
        { href: "/suppliers", label: t.suppliers, icon: Truck },
        { href: "/role-assignment", label: t.roleAssignment, icon: Users },
      ],
    },
    {
      section: t.financialReports,
      items: [
        { href: "/reports", label: t.reports, icon: TrendingUp },
        { href: "/ledger", label: t.ledger, icon: BookOpen },
        { href: "/trial-balance", label: t.trialBalance, icon: Scale },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <div className="h-8 w-8 rounded-md bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">
            T
          </div>
          <span className="font-semibold text-slate-900 tracking-tight">{shop?.shopName ?? "Tailor Shop"}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {localizedNav.map((group) => (
            <div key={group.section}>
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.section}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex items-center gap-3">
            <details className="relative lg:hidden">
              <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700">Menu</summary>
              <nav className="absolute start-0 top-11 z-30 max-h-[75vh] w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
                {localizedNav.map((group) => (
                  <div key={group.section} className="mb-4 last:mb-0">
                    <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.section}</div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100"><Icon className="size-4" />{item.label}</Link>;
                    })}
                  </div>
                ))}
              </nav>
            </details>
            <span className="text-sm text-slate-500">{t.tailoringWorkspace}</span>
            <LanguageSwitcher locale={locale} label={t.language} />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{session.name}</span>
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
              {initials(session.name)}
            </div>
            <form action={logout}>
              <button type="submit" className="text-slate-400 hover:text-slate-700 transition-colors" title={t.signOut}>
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
