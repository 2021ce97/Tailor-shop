import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";

interface TrialBalanceRow {
  [key: string]: unknown;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: string;
  total_credit: string;
  balance: string;
}

export default async function TrialBalancePage() {
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));
  const rows = await db.execute<TrialBalanceRow>(sql`SELECT * FROM trial_balance_view ORDER BY account_code`);

  const totalDebit = rows.reduce((s, r) => s + Number(r.total_debit), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.total_credit), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{t.trialBalance}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.trialBalanceDescription}</p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${isBalanced ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {isBalanced ? t.balanced : t.outOfBalance}
        </span>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">{t.code}</th>
              <th className="px-4 py-2.5">{t.account}</th>
              <th className="px-4 py-2.5">{t.type}</th>
              <th className="px-4 py-2.5 text-right">{t.debit}</th>
              <th className="px-4 py-2.5 text-right">{t.credit}</th>
              <th className="px-4 py-2.5 text-right">{t.balance}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {t.noPostings}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.account_code} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{r.account_code}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{r.account_name}</td>
                <td className="px-4 py-2.5 text-slate-500 capitalize">{r.account_type}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{Number(r.total_debit).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{Number(r.total_credit).toFixed(2)}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${Number(r.balance) >= 0 ? "text-slate-900" : "text-red-600"}`}>{Number(r.balance).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-2.5" colSpan={3}>
                  {t.total}
                </td>
                <td className="px-4 py-2.5 text-right">{totalDebit.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right">{totalCredit.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right">{(totalDebit - totalCredit).toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
