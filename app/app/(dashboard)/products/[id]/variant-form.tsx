"use client";

import { useActionState } from "react";
import { addVariant, type VariantFormState } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";

const initialState: VariantFormState = { status: "idle" };

export function VariantForm({ productId }: { productId: number }) {
  const [state, formAction, isPending] = useActionState(addVariant, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Add Variant</h2>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}
      <input type="hidden" name="productId" value={productId} />
      <div className="grid grid-cols-3 gap-4">
        <Field label="SKU" name="sku" required error={state.fieldErrors?.sku} />
        <Field label="Size" name="size" />
        <Field label="Color" name="color" />
        <Field label="Barcode" name="barcode" />
        <Field label="Price (blank = use base price)" name="price" type="number" step="0.01" />
        <Field label="Cost Price" name="costPrice" type="number" step="0.01" />
        <Field label="Opening Stock Qty" name="stockQty" type="number" defaultValue={0} />
        <Field label="Reorder Level" name="reorderLevel" type="number" defaultValue={5} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Add Variant"}
        </Button>
      </div>
    </form>
  );
}
