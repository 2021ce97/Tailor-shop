import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Scissors,
  Ruler,
  Calendar,
  Users,
  Truck,
  BookOpen,
  Scale,
  TrendingUp,
  Settings,
  LogOut,
  Shirt,
  Building2,
  ClipboardList,
  Undo2,
} from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { logout } from "@/app/actions/auth";
import { db, shopSettings, branches as branchesTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { BranchSwitcher } from "./branch-switcher";

const nav = [
  { section: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Retail (POS)",
    items: [
      { href: "/pos", label: "New Sale", icon: ShoppingCart },
      { href: "/sale-returns", label: "Returns / Exchanges", icon: Undo2 },
      { href: "/products", label: "Products", icon: Shirt },
      { href: "/inventory", label: "Inventory / Stock", icon: Package },
      { href: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
    ],
  },
  {
    section: "Tailoring",
    items: [
      { href: "/tailor-orders/new", label: "New Order", icon: Scissors },
      { href: "/tailor-orders", label: "All Orders", icon: Scissors },
      { href: "/fabrics", label: "Fabric Inventory", icon: Ruler },
      { href: "/appointments", label: "Appointments", icon: Calendar },
    ],
  },
  {
    section: "Master Data",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/suppliers", label: "Suppliers", icon: Truck },
      { href: "/branches", label: "Branches", icon: Building2 },
    ],
  },
  {
    section: "Accounts",
    items: [
      { href: "/ledger", label: "Ledger", icon: BookOpen },
      { href: "/trial-balance", label: "Trial Balance", icon: Scale },
      { href: "/reports", label: "Reports", icon: TrendingUp },
    ],
  },
  { section: "System", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const [shop] = await db.select({ shopName: shopSettings.shopName }).from(shopSettings).where(eq(shopSettings.id, 1));

  const canSwitchBranch = session.roleName === "owner" || session.roleName === "manager";
  const branchList = canSwitchBranch
    ? await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable).where(eq(branchesTable.status, "active"))
    : [];

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <div className="h-8 w-8 rounded-md bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">
            T
          </div>
          <span className="font-semibold text-slate-900 tracking-tight">{shop?.shopName ?? "Tailor Shop"}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {nav.map((group) => (
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
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 capitalize">{session.roleName}</span>
            {canSwitchBranch ? (
              <BranchSwitcher branches={branchList} currentBranchId={session.branchId} />
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">{session.branchName}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{session.name}</span>
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
              {initials(session.name)}
            </div>
            <form action={logout}>
              <button type="submit" className="text-slate-400 hover:text-slate-700 transition-colors" title="Sign out">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
