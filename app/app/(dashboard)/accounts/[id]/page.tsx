import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessContacts, contactAccountEntries } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { getLocale, getTranslations } from "@/lib/i18n";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { payBusinessContact } from "@/app/actions/garment-management";
import EditContactForm from "../edit-contact-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireSession();
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("tailor_locale")?.value);
  const t = getTranslations(locale);

  const [contact] = await db
    .select()
    .from(businessContacts)
    .where(eq(businessContacts.id, Number(id)));

  if (!contact) {
    notFound();
  }

  // Verify contact belongs to user's branch
  if (contact.branchId !== session.branchId) {
    notFound();
  }

  // Fetch account entries
  const entries = await db
    .select()
    .from(contactAccountEntries)
    .where(eq(contactAccountEntries.businessContactId, Number(id)))
    .orderBy(desc(contactAccountEntries.entryDate));

  const outstandingBalance = entries.reduce(
    (sum, entry) => sum + Number(entry.debitAmount || 0) - Number(entry.creditAmount || 0),
    0
  );

  const headerBg =
    locale === "ps"
      ? "from-purple-50 via-slate-50 to-pink-50"
      : "from-blue-50 via-slate-50 to-indigo-50";
  const text = locale === "en"
    ? { accountCode: "Account code: ", active: "Active", inactive: "Inactive", debit: "Debit", credit: "Credit" }
    : locale === "fa"
      ? { accountCode: "کد حساب: ", active: "فعال", inactive: "غیرفعال", debit: "بدهی", credit: "اعتبار" }
      : { accountCode: "د حساب کوډ: ", active: "فعال", inactive: "غیرفعال", debit: "بدهکار", credit: "بستانکار" };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={`bg-gradient-to-r ${headerBg} border-b border-slate-200 px-6 py-8`}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{contact.name}</h1>
          <p className="text-slate-600 text-sm">
            {text.accountCode}
            <span className="font-mono font-medium text-slate-900">{contact.contactCode}</span>
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Edit Form */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900">
              {t.editDetails}
            </h2>
          </div>
          <EditContactForm 
            contact={{
              ...contact,
              roles: (contact.roles as string[]) || []
            }} 
            locale={locale} 
            t={t} 
          />
        </div>

        {/* Contact Information Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              {t.contactInfo}
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">
                  {t.phone}
                </dt>
                <dd className="text-sm text-slate-900">
                  {contact.phone || t.notRecorded}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">
                  {t.roles}
                </dt>
                <dd className="flex flex-wrap gap-2 mt-2">
                  {Array.isArray(contact.roles) && contact.roles.length > 0 ? (
                    contact.roles.map((role: string) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">
                      {t.noRoles}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">
                  {t.status}
                </dt>
                <dd>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      contact.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {contact.status === "active"
                      ? text.active
                      : text.inactive}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              {t.notes}
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {contact.notes || (
                <span className="text-slate-400">
                  {t.noNotes}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Worker Payment */}
        {outstandingBalance > 0 && (
          <form action={payBusinessContact} className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
            <input type="hidden" name="businessContactId" value={contact.id} />
            <div>
              <h2 className="font-semibold text-slate-900">
                {t.payWorker}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t.outstandingBalance}:{" "}
                <span className="font-semibold text-slate-900">{outstandingBalance.toFixed(2)} AFN</span>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">{t.amount}</span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={outstandingBalance.toFixed(2)}
                  defaultValue={outstandingBalance.toFixed(2)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">{t.paymentMethod}</span>
                <select name="paymentMethod" className="w-full rounded-md border border-slate-300 px-3 py-2">
                  <option value="cash">{t.cash}</option>
                  <option value="bank">{t.bank}</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {t.recordPayment}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Account Ledger */}
        {entries.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900">
                {t.accountLedger}
              </h2>
            </div>
            <div className="mobile-table-scroll">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-3">{t.date}</th>
                    <th className="px-6 py-3">{t.entryType}</th>
                    <th className="px-6 py-3">{t.notes}</th>
                    <th className="px-6 py-3 text-right">{text.debit}</th>
                    <th className="px-6 py-3 text-right">{text.credit}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-900">
                        {new Date(entry.entryDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-slate-700">{entry.entryType}</td>
                      <td className="px-6 py-3 text-slate-600">{entry.notes || "-"}</td>
                      <td className="px-6 py-3 text-right text-slate-900">
                        {Number(entry.debitAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-900">
                        {Number(entry.creditAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
