import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessContacts, contactAccountEntries } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { getLocale, getTranslations } from "@/lib/i18n";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
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

  const headerBg =
    locale === "ps"
      ? "from-purple-50 via-slate-50 to-pink-50"
      : "from-blue-50 via-slate-50 to-indigo-50";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={`bg-gradient-to-r ${headerBg} border-b border-slate-200 px-6 py-8`}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{contact.name}</h1>
          <p className="text-slate-600 text-sm">
            {locale === "ps" ? "حساب کد: " : "رمز حساب: "}
            <span className="font-mono font-medium text-slate-900">{contact.contactCode}</span>
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Edit Form */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900">
              {locale === "ps" ? "تفصیلات تدوین کریں" : "تدوین تفاصیل"}
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
              {locale === "ps" ? "رابطہ معلومات" : "اطلاعات تماس"}
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">
                  {locale === "ps" ? "ٹیلیفون" : "شماره تماس"}
                </dt>
                <dd className="text-sm text-slate-900">
                  {contact.phone || (locale === "ps" ? "ثبت نہیں شدہ" : "ثبت نشده")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">
                  {locale === "ps" ? "دندے" : "نقش‌ها"}
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
                      {locale === "ps" ? "کوئی نقش تفویض نہیں" : "بدون نقش"}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">
                  {locale === "ps" ? "حالت" : "وضعیت"}
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
                      ? locale === "ps"
                        ? "فعال"
                        : "فعال"
                      : locale === "ps"
                        ? "غیر فعال"
                        : "غیرفعال"}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              {locale === "ps" ? "یادداشتیں" : "یادداشت‌ها"}
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {contact.notes || (
                <span className="text-slate-400">
                  {locale === "ps" ? "کوئی یادداشت نہیں" : "بدون یادداشت"}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Account Ledger */}
        {entries.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900">
                {locale === "ps" ? "حساب لیجر" : "دفترچہ حسابات"}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-3">{locale === "ps" ? "تاریخ" : "تاریخ"}</th>
                    <th className="px-6 py-3">{locale === "ps" ? "قسم" : "نوع"}</th>
                    <th className="px-6 py-3">{locale === "ps" ? "یادداشت" : "یادداشت"}</th>
                    <th className="px-6 py-3 text-right">{locale === "ps" ? "نقل" : "بدهی"}</th>
                    <th className="px-6 py-3 text-right">{locale === "ps" ? "جمع" : "اعتبار"}</th>
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
