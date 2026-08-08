"use client";

import { useActionState } from "react";
import { createSupplier, type SupplierFormState } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import type { TranslationSet } from "@/lib/i18n";

const initialState: SupplierFormState = { status: "idle" };

export function SupplierForm({ translations: t }: { translations: TranslationSet }) {
  const [state, formAction, isPending] = useActionState(createSupplier, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">{t.newSupplier}</h2>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}
      <div className="grid grid-cols-2 gap-4">
        <Field label={t.name} name="name" required error={state.fieldErrors?.name} />
        <Field label={t.type} name="type" placeholder="fabric, ready_made, accessories…" />
        <Field label={t.phone} name="phone" />
        <Field label="Email" name="email" type="email" error={state.fieldErrors?.email} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? t.saving : t.addSupplier}
        </Button>
      </div>
    </form>
  );
}
