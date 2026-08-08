"use client";

import { useActionState } from "react";
import { createFabric, restockFabric, type FabricFormState } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import type { TranslationSet } from "@/lib/i18n";

const initialState: FabricFormState = { status: "idle" };

export function FabricForm({ translations: t }: { translations: TranslationSet }) {
  const [state, formAction, isPending] = useActionState(createFabric, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">{t.newFabric}</h2>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}

      <div className="grid grid-cols-3 gap-4">
        <Field label={t.name} name="name" required error={state.fieldErrors?.name} />
        <Field label={t.fabricType} name="fabricType" placeholder="cotton, linen, silk…" />
        <Field label={t.color} name="color" />
        <Field label={t.pattern} name="pattern" />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">{t.unit}</span>
          <select name="unit" defaultValue="meter" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
            <option value="meter">Meter</option>
            <option value="yard">Yard</option>
            <option value="piece">Piece</option>
          </select>
        </label>
        <Field label={t.openingStock} name="stockQty" type="number" step="0.01" defaultValue={0} />
        <Field label={t.reorderLevel} name="reorderLevel" type="number" step="0.01" defaultValue={10} />
        <Field label={t.costUnit} name="costPerUnit" type="number" step="0.01" defaultValue={0} />
        <Field label={t.sellingPriceUnit} name="sellingPricePerUnit" type="number" step="0.01" defaultValue={0} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Add Fabric"}
        </Button>
      </div>
    </form>
  );
}

export function RestockRow({ fabricId }: { fabricId: number }) {
  return (
    <form action={restockFabric} className="flex items-center gap-1">
      <input type="hidden" name="fabricId" value={fabricId} />
      <input
        name="quantity"
        type="number"
        step="0.01"
        placeholder="Qty"
        required
        className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <button type="submit" className="text-xs text-slate-500 hover:text-slate-900 underline">
        Restock
      </button>
    </form>
  );
}
