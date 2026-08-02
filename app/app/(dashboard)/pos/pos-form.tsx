"use client";

import { useActionState, useMemo, useState } from "react";
import { submitPosSale, type PosFormState } from "@/app/actions/pos";
import { Button } from "@/components/ui/button";
import { SearchableSelect, type SearchableOption } from "@/components/shared/searchable-select";
import { Trash2 } from "lucide-react";

const initialState: PosFormState = { status: "idle" };

interface VariantInfo {
  id: number;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  stockQty: number;
}

interface CartLine {
  variantId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
}

export function PosForm({ customers, variants }: { customers: SearchableOption[]; variants: VariantInfo[] }) {
  const [state, formAction, isPending] = useActionState(submitPosSale, initialState);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);

  const variantOptions: SearchableOption[] = variants.map((v) => ({
    value: v.id,
    label: `${v.productName} — ${v.sku}`,
    sublabel: `${[v.size, v.color].filter(Boolean).join(" / ")} · ${v.stockQty} in stock · ${v.price.toFixed(2)}`,
  }));

  function addToCart(variantId: number) {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === variantId);
      if (existing) {
        return prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(l.quantity + 1, variant.stockQty) } : l));
      }
      return [...prev, { variantId, productName: variant.productName, sku: variant.sku, quantity: 1, unitPrice: variant.price, maxStock: variant.stockQty }];
    });
  }

  function updateQty(variantId: number, quantity: number) {
    setCart((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(quantity, l.maxStock)) } : l)));
  }

  function removeLine(variantId: number) {
    setCart((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0), [cart]);
  const total = useMemo(() => subtotal - discount + taxAmount, [subtotal, discount, taxAmount]);

  const itemsJson = JSON.stringify(cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })));

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center justify-between">
          <span>{state.message}</span>
          {state.saleId && (
            <a href={`/api/sales/${state.saleId}/pdf`} target="_blank" rel="noopener noreferrer" className="underline font-medium">
              Print Receipt
            </a>
          )}
        </div>
      )}
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">{state.message}</div>
      )}

      <input type="hidden" name="itemsJson" value={itemsJson} />

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Add items</h2>
        <div className="max-w-md">
          <PickAndAdd options={variantOptions} onAdd={addToCart} />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">Line Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Cart is empty — search for an item above.
                </td>
              </tr>
            )}
            {cart.map((l) => (
              <tr key={l.variantId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900">
                  {l.productName} <span className="text-slate-400 font-normal">({l.sku})</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min={1}
                    max={l.maxStock}
                    value={l.quantity}
                    onChange={(e) => updateQty(l.variantId, Number(e.target.value) || 1)}
                    className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                  />
                </td>
                <td className="px-4 py-2 text-right text-slate-600">{l.unitPrice.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-medium text-slate-900">{(l.quantity * l.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => removeLine(l.variantId)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <input type="hidden" name="saleDate" value={new Date().toISOString().slice(0, 10)} />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Sale No</span>
            <input name="saleNo" required defaultValue={`SALE-${Date.now()}`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none" />
          </label>
          <SearchableSelect name="customerId" label="Customer (optional)" options={customers} />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Payment Method</span>
            <select name="paymentMethod" defaultValue="cash" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Discount</span>
            <input name="discount" type="number" step="0.01" defaultValue={0} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Tax Amount</span>
            <input name="taxAmount" type="number" step="0.01" defaultValue={0} onChange={(e) => setTaxAmount(Number(e.target.value) || 0)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none" />
          </label>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
          <div>
            <div className="text-xs text-slate-400">Total</div>
            <div className="text-xl font-semibold text-slate-900">{total.toFixed(2)}</div>
          </div>
          <input type="hidden" name="amountPaid" value={total} />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || cart.length === 0} size="lg">
          {isPending ? "Completing sale…" : "Complete Sale"}
        </Button>
      </div>
    </form>
  );
}

function PickAndAdd({ options, onAdd }: { options: SearchableOption[]; onAdd: (variantId: number) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 15);
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)).slice(0, 15);
  }, [query, options]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search by product name or SKU…"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full mt-1 z-10 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => {
                onAdd(o.value);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex flex-col"
            >
              <span className="text-slate-900">{o.label}</span>
              {o.sublabel && <span className="text-xs text-slate-400">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
