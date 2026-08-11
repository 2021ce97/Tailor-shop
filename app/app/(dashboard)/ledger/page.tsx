import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";

interface LedgerRow {
  [key: string]: unknown;
  account_name: string;
  txn_no: string;
  txn_type: string;
  txn_date: string;
  description: string | null;
  debit_amount: string;
  credit_amount: string;
}

export default async function LedgerPage() {
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));
  const rows = await db.execute<LedgerRow>(sql`
    SELECT account_name, txn_no, txn_type, txn_date, description, debit_amount, credit_amount
    FROM ledger_view ORDER BY txn_date DESC, transaction_id DESC LIMIT 200
  `);

  return (
    <div>
      <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">{t.ledger}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.ledgerDescription}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg mobile-table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">{t.date}</th>
              <th className="px-4 py-2.5">{t.transactionNumber}</th>
              <th className="px-4 py-2.5">{t.account}</th>
              <th className="px-4 py-2.5">{t.description}</th>
              <th className="px-4 py-2.5 text-right">{t.debit}</th>
              <th className="px-4 py-2.5 text-right">{t.credit}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {t.noLedgerEntries}
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-600">{r.txn_date}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{r.txn_no}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.account_name}</td>
                <td className="px-4 py-2.5 text-slate-500">{r.description ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{Number(r.debit_amount) > 0 ? Number(r.debit_amount).toFixed(2) : ""}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{Number(r.credit_amount) > 0 ? Number(r.credit_amount).toFixed(2) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
