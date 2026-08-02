"use client";

import { useActionState } from "react";
import { createFabric, restockFabric, type FabricFormState } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";

const initialState: FabricFormState = { status: "idle" };

export function FabricForm() {
  const [state, formAction, isPending] = useActionState(createFabric, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">New Fabric</h2>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}

      <div className="grid grid-cols-3 gap-4">
        <Field label="Name" name="name" required error={state.fieldErrors?.name} />
        <Field label="Fabric Type" name="fabricType" placeholder="cotton, linen, silk…" />
        <Field label="Color" name="color" />
        <Field label="Pattern" name="pattern" />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Unit</span>
          <select name="unit" defaultValue="meter" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
            <option value="meter">Meter</option>
            <option value="yard">Yard</option>
            <option value="piece">Piece</option>
          </select>
        </label>
        <Field label="Opening Stock Qty" name="stockQty" type="number" step="0.01" defaultValue={0} />
        <Field label="Reorder Level" name="reorderLevel" type="number" step="0.01" defaultValue={10} />
        <Field label="Cost Per Unit" name="costPerUnit" type="number" step="0.01" defaultValue={0} />
        <Field label="Selling Price Per Unit" name="sellingPricePerUnit" type="number" step="0.01" defaultValue={0} />
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
