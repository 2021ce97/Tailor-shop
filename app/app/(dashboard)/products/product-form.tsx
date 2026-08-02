"use client";

import { useActionState } from "react";
import { createProduct, type ProductFormState } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";

const initialState: ProductFormState = { status: "idle" };

export function ProductForm() {
  const [state, formAction, isPending] = useActionState(createProduct, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">New Product</h2>
      <p className="text-xs text-slate-400">Creates the product along with its first size/color variant. Add more variants from the product's page.</p>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}

      <div className="grid grid-cols-3 gap-4">
        <Field label="Product Name" name="name" required error={state.fieldErrors?.name} />
        <Field label="Brand" name="brand" />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Gender</span>
          <select name="gender" defaultValue="unisex" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="kids">Kids</option>
            <option value="unisex">Unisex</option>
          </select>
        </label>
        <Field label="Selling Price" name="basePrice" type="number" step="0.01" required />
        <Field label="Cost Price" name="costPrice" type="number" step="0.01" defaultValue={0} />
      </div>

      <div className="pt-3 border-t border-slate-100">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">First Variant</h3>
        <div className="grid grid-cols-3 gap-4">
          <Field label="SKU" name="sku" required error={state.fieldErrors?.sku} />
          <Field label="Size" name="size" placeholder="S, M, L, 32, 34…" />
          <Field label="Color" name="color" />
          <Field label="Barcode" name="barcode" />
          <Field label="Opening Stock Qty" name="stockQty" type="number" defaultValue={0} />
          <Field label="Reorder Level" name="reorderLevel" type="number" defaultValue={5} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Add Product"}
        </Button>
      </div>
    </form>
  );
}
