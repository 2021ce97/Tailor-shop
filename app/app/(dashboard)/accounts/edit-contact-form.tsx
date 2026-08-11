"use client";

import { useActionState, useState } from "react";
import { updateBusinessContact } from "@/app/actions/business-contacts";

interface EditContactFormProps {
  contact: {
    id: number;
    name: string;
    phone: string | null;
    roles: string[] | null;
    status: string;
    notes: string | null;
  };
  locale: "en" | "fa" | "ps";
  t: Record<string, string>;
}

const AVAILABLE_ROLES = [
  { value: "supplier", label_ps: "عرضه کوونکی", label_fa: "تأمین‌کننده", label_en: "Supplier" },
  { value: "tailor", label_ps: "خیاط", label_fa: "خیاط", label_en: "Tailor" },
  { value: "cutter", label_ps: "قیچي کوونکی", label_fa: "برش‌کار", label_en: "Cutter" },
  { value: "business", label_ps: "سوداګري", label_fa: "تجارت", label_en: "Business" },
];

export default function EditContactForm({ contact, locale, t }: EditContactFormProps) {
  const [state, formAction, pending] = useActionState(updateBusinessContact, { status: "idle" });
  const [selectedRoles, setSelectedRoles] = useState<string[]>(contact.roles || []);
  const text = locale === "en"
    ? { active: "Active", inactive: "Inactive", updating: "Updating...", update: "Update" }
    : locale === "fa"
      ? { active: "فعال", inactive: "غیرفعال", updating: "در حال بروزرسانی...", update: "بروزرسانی کنید" }
      : { active: "فعال", inactive: "غیرفعال", updating: "سمېږي...", update: "سمول" };

  const handleRoleChange = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
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

      <input type="hidden" name="id" value={contact.id} />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-900">
          {t.name}
        </label>
        <input
          type="text"
          name="name"
          defaultValue={contact.name}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-900">
          {t.phone}
        </label>
        <input
          type="tel"
          name="phone"
          defaultValue={contact.phone || ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-900">
          {t.roles}
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
        <input type="hidden" name="roles" value={JSON.stringify(selectedRoles)} />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-900">
          {t.status}
        </label>
        <select
          name="status"
          defaultValue={contact.status}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="active">
            {text.active}
          </option>
          <option value="inactive">
            {text.inactive}
          </option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-900">
          {t.notes}
        </label>
        <textarea
          name="notes"
          defaultValue={contact.notes || ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? text.updating : text.update}
      </button>
    </form>
  );
}
