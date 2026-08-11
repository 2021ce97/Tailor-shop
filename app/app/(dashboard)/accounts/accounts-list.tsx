import Link from "next/link";

interface AccountsListProps {
  locale: "en" | "fa" | "ps";
  contacts: {
    id: number;
    name: string;
    contactCode: string;
    phone: string | null;
    roles: unknown;
    status: string;
    outstandingBalance?: number;
  }[];
}

export function AccountsList({ locale, contacts }: AccountsListProps) {
  const roles: Record<string, string> = {
    business: locale === "ps" ? "سوداګري" : "تجارت",
    supplier: locale === "ps" ? "عرضه کوونکی" : "تأمین‌کننده",
    tailor: locale === "ps" ? "خیاط" : "خیاط",
    cutter: locale === "ps" ? "قیچي کوونکی" : "برش‌کار",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">
          {locale === "ps" ? "تمام حسابات" : "تمام حساب‌ها"}
          <span className="ml-2 text-sm text-slate-500">({contacts.length})</span>
        </h2>
      </div>

      {contacts.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-500 text-sm">
          {locale === "ps" ? "کوم حساب نه ده" : "هیچ حسابی موجود نیست"}
        </div>
      ) : (
        <div className="mobile-table-scroll">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-600">
                  {locale === "ps" ? "نام" : "نام"}
                </th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">
                  {locale === "ps" ? "ټیلیفون" : "تماس"}
                </th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">
                  {locale === "ps" ? "دندې" : "نقش‌ها"}
                </th>
                <th className="px-6 py-3 text-right font-medium text-slate-600">
                  {locale === "ps" ? "باقي" : "باقی"}
                </th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">
                  {locale === "ps" ? "حالت" : "وضعیت"}
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, index) => (
                <tr
                  key={contact.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="px-6 py-4">
                    <Link href={`/accounts/${contact.id}`} className="font-medium text-slate-900 hover:text-slate-600">
                      {contact.name}
                    </Link>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      {contact.contactCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {contact.phone || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(contact.roles) && contact.roles.length > 0 ? (
                        contact.roles.map((role: string) => (
                          <span
                            key={role}
                            className="inline-block px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700"
                          >
                            {roles[role] || role}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {Number(contact.outstandingBalance || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        contact.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {contact.status === "active"
                        ? locale === "ps"
                          ? "چالو"
                          : "فعال"
                        : locale === "ps"
                          ? "بند"
                          : "غیرفعال"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
