import { LoginForm } from "./login-form";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export default async function LoginPage() {
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative">
      <div className="absolute top-5 end-5"><LanguageSwitcher locale={locale} label={t.language} /></div>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-9 w-9 rounded-md bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">
            T
          </div>
          <span className="font-semibold text-slate-900 tracking-tight text-lg">{t.appName}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h1 className="text-base font-semibold text-slate-900 mb-1">{t.signIn}</h1>
          <p className="text-sm text-slate-500 mb-5">{t.signInDescription}</p>
          <LoginForm translations={t} />
        </div>
      </div>
    </div>
  );
}
