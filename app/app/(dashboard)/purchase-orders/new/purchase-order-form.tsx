"use client";

import { useActionState, useMemo, useState } from "react";
import { submitPurchaseOrder, type PoFormState } from "@/app/actions/purchase-orders";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { SearchableSelect, type SearchableOption } from "@/components/shared/searchable-select";
import { Plus, Trash2 } from "lucide-react";

const initialState: PoFormState = { status: "idle" };

interface Line {
  lineType: "variant" | "fabric" | "other";
  variantId: number | null;
  fabricId: number | null;
  description: string;
  quantity: string;
  unitCost: string;
}

const emptyLine = (): Line => ({ lineType: "fabric", variantId: null, fabricId: null, description: "", quantity: "", unitCost: "" });

export function PurchaseOrderForm({ suppliers, variants, fabrics }: { suppliers: SearchableOption[]; variants: SearchableOption[]; fabrics: SearchableOption[] }) {
  const [state, formAction, isPending] = useActionState(submitPurchaseOrder, initialState);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
    [lines]
  );

  const itemsJson = JSON.stringify(
    lines
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({
        lineType: l.lineType,
        variantId: l.variantId ?? undefined,
        fabricId: l.fabricId ?? undefined,
        description: l.description || undefined,
        quantity: Number(l.quantity) || 0,
        unitCost: Number(l.unitCost) || 0,
      }))
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800">{state.message}</div>
      )}
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">{state.message}</div>
      )}

      <input type="hidden" name="itemsJson" value={itemsJson} />

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Order details</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="PO No" name="poNo" required error={state.fieldErrors?.poNo} />
          <SearchableSelect name="supplierId" label="Supplier" options={suppliers} required error={state.fieldErrors?.supplierId} />
          <Field label="Order Date" name="orderDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} error={state.fieldErrors?.orderDate} />
          <Field label="Expected Date" name="expectedDate" type="date" />
        </div>
        <div className="mt-3">
          <Field label="Notes" name="notes" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
          <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
            <Plus className="size-3.5" /> Add line
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="border border-slate-100 rounded-md p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-end">
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">Type</span>
                  <select
                    value={line.lineType}
                    onChange={(e) => updateLine(i, { lineType: e.target.value as Line["lineType"], variantId: null, fabricId: null })}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none"
                  >
                    <option value="fabric">Fabric</option>
                    <option value="variant">Retail Variant</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <div className="col-span-4">
                  {line.lineType === "fabric" && (
                    <MiniPicker options={fabrics} placeholder="Search fabric…" onSelect={(id) => updateLine(i, { fabricId: id })} />
                  )}
                  {line.lineType === "variant" && (
                    <MiniPicker options={variants} placeholder="Search SKU…" onSelect={(id) => updateLine(i, { variantId: id })} />
                  )}
                  {line.lineType === "other" && (
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                      placeholder="Description"
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none"
                    />
                  )}
                </div>

                <input
                  type="number"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  placeholder="Qty"
                  className="col-span-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) => updateLine(i, { unitCost: e.target.value })}
                  placeholder="Unit cost"
                  className="col-span-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none"
                />
                <div className="col-span-1 text-sm text-slate-600 text-right">
                  {((Number(line.quantity) || 0) * (Number(line.unitCost) || 0)).toFixed(2)}
                </div>
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 1} className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 disabled:opacity-30">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-right text-sm">
          <span className="text-xs text-slate-400 mr-2">Total</span>
          <span className="font-semibold text-slate-900">{total.toFixed(2)}</span>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="reset" variant="outline">
          Clear
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create Purchase Order"}
        </Button>
      </div>
    </form>
  );
}

function MiniPicker({ options, placeholder, onSelect }: { options: SearchableOption[]; placeholder: string; onSelect: (id: number) => void }) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 15);
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 15);
  }, [query, options]);

  return (
    <div className="relative">
      <input
        value={label || query}
        onChange={(e) => {
          setLabel("");
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full mt-1 z-10 w-full max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => {
                onSelect(o.value);
                setLabel(o.label);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-slate-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
