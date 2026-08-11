"use client";

import { useActionState } from "react";
import { updateShopSettings, type SettingsFormState } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import type { TranslationSet } from "@/lib/i18n";

const initialState: SettingsFormState = { status: "idle" };

export function SettingsForm({
  shopName,
  address,
  phone,
  email,
  currency,
  taxPercent,
  logoUrl,
  translations: t,
}: {
  shopName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  taxPercent: string;
  logoUrl: string | null;
  translations: TranslationSet;
}) {
  const [state, formAction, isPending] = useActionState(updateShopSettings, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 max-w-2xl w-full">
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.shopName} name="shopName" required defaultValue={shopName} error={state.fieldErrors?.shopName} />
        <Field label={t.phone} name="phone" defaultValue={phone ?? ""} />
        <Field label={t.email} name="email" type="email" defaultValue={email ?? ""} error={state.fieldErrors?.email} />
        <Field label={t.currency} name="currency" defaultValue={currency} />
        <Field label={t.taxPercent} name="taxPercent" type="number" step="0.01" defaultValue={taxPercent} />
        <Field label={t.logoUrl} name="logoUrl" type="url" defaultValue={logoUrl ?? ""} />
      </div>
      <Field label={t.address} name="address" defaultValue={address ?? ""} />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? t.saving : t.saveSettings}
        </Button>
      </div>
    </form>
  );
}
