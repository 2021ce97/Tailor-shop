import Link from "next/link";
import { db, customers } from "@/lib/db";
import { desc } from "drizzle-orm";
import { CustomerForm } from "./customer-form";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";

export default async function CustomersPage() {
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(100);
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-slate-50 to-teal-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t.customersPage}</h1>
        <p className="text-sm text-slate-600 mt-1">{t.customerHelp}</p>
      </div>

      <CustomerForm translations={t} />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">{t.name}</th><th className="px-4 py-2.5">{t.phone}</th><th className="px-4 py-2.5">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                  {t.noCustomers}
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/customers/${c.id}`} className="font-medium text-slate-900 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{c.phone ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
