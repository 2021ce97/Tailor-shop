"use client";

import { useActionState, useState } from "react";
import { createBusinessContact } from "@/app/actions/business-contacts";

interface CreateContactFormProps {
  locale: "en" | "fa" | "ps";
  t: Record<string, string>;
}

const AVAILABLE_ROLES = [
  { value: "supplier", label_ps: "عرضه کوونکی", label_fa: "تأمین‌کننده", label_en: "Supplier" },
  { value: "tailor", label_ps: "خیاط", label_fa: "خیاط", label_en: "Tailor" },
  { value: "cutter", label_ps: "قیچي کوونکی", label_fa: "برش‌کار", label_en: "Cutter" },
  { value: "business", label_ps: "سوداګري", label_fa: "تجارت", label_en: "Business" },
];

export function CreateContactForm({ locale, t }: CreateContactFormProps) {
  const [state, formAction, pending] = useActionState(createBusinessContact, { status: "idle" });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const handleRoleChange = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-900">
          {locale === "ps" ? "نوی حساب" : "حساب جدید"}
        </h2>
      </div>

      <form action={formAction} className="p-6 space-y-4">
        {state.message && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              state.status === "error"
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {state.message}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-900">
            {locale === "ps" ? "نام" : "نام"}
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder={locale === "ps" ? "نام درج کړئ" : "نام را وارد کنید"}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-900">
            {locale === "ps" ? "ټیلیفون" : "شماره تماس"}
          </label>
          <input
            type="tel"
            name="phone"
            placeholder={locale === "ps" ? "ټیلیفون درج کړئ" : "شماره تماس را وارد کنید"}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-900">
            {locale === "ps" ? "دندې" : "نقش‌ها"}
          </label>
          <div className="space-y-2">
            {AVAILABLE_ROLES.map((role) => (
              <label key={role.value} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.value)}
                  onChange={() => handleRoleChange(role.value)}
                  className="w-4 h-4 border border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700">
                  {locale === "ps" ? role.label_ps : locale === "fa" ? role.label_fa : role.label_en}
                </span>
              </label>
            ))}
          </div>
          <input
            type="hidden"
            name="roles"
            value={JSON.stringify(selectedRoles)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-900">
            {locale === "ps" ? "یادداشت" : "یادداشت"}
          </label>
          <textarea
            name="notes"
            placeholder={locale === "ps" ? "یادداشت درج کړئ" : "یادداشت را وارد کنید"}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50"
        >
          {pending
            ? locale === "ps"
              ? "کمزوری کېږي..."
              : "در حال ثبت..."
            : locale === "ps"
              ? "ثبت کړئ"
              : "ثبت کنید"}
        </button>
      </form>
    </div>
  );
}
