import { requireSession } from "@/lib/auth/get-session";
import { getLocale, getTranslations } from "@/lib/i18n";
import { cookies } from "next/headers";
import { getBusinessContacts } from "@/app/actions/business-contacts";
import { AccountsList } from "./accounts-list";
import { CreateContactForm } from "./create-contact-form";

export default async function AccountsPage() {
  const session = await requireSession();
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const t = getTranslations(locale);

  const contacts = await getBusinessContacts(session.branchId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-purple-50 via-slate-50 to-pink-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {locale === "ps" ? "کاري حساب‌ات" : "حساب‌های کاری"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {locale === "ps"
            ? "کارگران، تاجرین، او سپلائی‌کار"
            : "کارگران، فروشندگان، و تأمین‌کنندگان"}
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Form */}
        <div className="lg:col-span-1">
          <CreateContactForm locale={locale} t={t} />
        </div>

        {/* Contacts List */}
        <div className="lg:col-span-2">
          <AccountsList locale={locale} contacts={contacts} t={t} />
        </div>
      </div>
    </div>
  );
}
