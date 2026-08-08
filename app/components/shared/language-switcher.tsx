"use client";

import { localeLabels, locales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale, label = "Language" }: { locale: Locale; label?: string }) {
  function changeLanguage(nextLocale: Locale) {
    document.cookie = `tailor_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(event) => changeLanguage(event.target.value as Locale)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-slate-400"
        aria-label={label}
      >
        {locales.map((option) => (
          <option key={option} value={option}>
            {localeLabels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
