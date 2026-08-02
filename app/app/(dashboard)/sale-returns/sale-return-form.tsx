"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { submitSaleReturn, lookupSaleForReturn, type SaleReturnFormState, type ReturnableLine } from "@/app/actions/sale-returns";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";

const initialState: SaleReturnFormState = { status: "idle" };

export function SaleReturnForm() {
  const [state, formAction, isPending] = useActionState(submitSaleReturn, initialState);
  const [isLookingUp, startLookup] = useTransition();

  const [saleNoQuery, setSaleNoQuery] = useState("");
  const [saleInfo, setSaleInfo] = useState<{ saleId: number; saleNo: string; saleDate: string; totalAmount: number; lines: ReturnableLine[] } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, string>>({});

  function handleLookup() {
    setLookupError(null);
    startLookup(async () => {
      const result = await lookupSaleForReturn(saleNoQuery);
      if (result.found) {
        setSaleInfo(result);
        setReturnQtys({});
      } else {
        setSaleInfo(null);
        setLookupError(result.message);
      }
    });
  }

  const returnableLines = saleInfo?.lines.filter((l) => l.quantity - l.returnedQty > 0) ?? [];

  const itemsJson = JSON.stringify(
    returnableLines
      .map((l) => ({ saleItemId: l.saleItemId, quantity: Number(returnQtys[l.saleItemId]) || 0 }))
      .filter((l) => l.quantity > 0)
  );

  const refundTotal = useMemo(() => {
    if (!saleInfo) return 0;
    return returnableLines.reduce((s, l) => s + (Number(returnQtys[l.saleItemId]) || 0) * l.unitPrice, 0);
  }, [returnQtys, returnableLines, saleInfo]);

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800">{state.message}</div>
      )}
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">{state.message}</div>
      )}

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Find the sale</h2>
        <div className="flex gap-2 max-w-md">
          <input
            value={saleNoQuery}
            onChange={(e) => setSaleNoQuery(e.target.value)}
            placeholder="Sale No, e.g. SALE-1234567890"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none"
          />
          <Button type="button" variant="outline" onClick={handleLookup} disabled={isLookingUp || !saleNoQuery.trim()}>
            {isLookingUp ? "Looking up…" : "Find"}
          </Button>
        </div>
        {lookupError && <p className="text-xs text-red-500 mt-2">{lookupError}</p>}
      </section>

      {saleInfo && (
        <>
          <input type="hidden" name="saleId" value={saleInfo.saleId} />
          <input type="hidden" name="itemsJson" value={itemsJson} />

          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Sale {saleInfo.saleNo} <span className="text-slate-400 font-normal">— {saleInfo.saleDate}</span>
            </h2>
            {returnableLines.length === 0 ? (
              <p className="text-sm text-slate-400 mt-3">Everything on this sale has already been returned.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-3">Sold / Returnable</div>
                  <div className="col-span-3">Return Qty</div>
                </div>
                {returnableLines.map((l) => (
                  <div key={l.saleItemId} className="grid grid-cols-12 gap-2 items-center text-sm">
                    <div className="col-span-6 text-slate-700">{l.label}</div>
                    <div className="col-span-3 text-slate-400 text-xs">
                      {l.quantity} sold, {l.quantity - l.returnedQty} returnable
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={l.quantity - l.returnedQty}
                      value={returnQtys[l.saleItemId] ?? ""}
                      onChange={(e) => setReturnQtys((prev) => ({ ...prev, [l.saleItemId]: e.target.value }))}
                      placeholder="0"
                      className="col-span-3 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Return details</h2>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Return No" name="returnNo" required defaultValue={`RET-${Date.now()}`} error={state.fieldErrors?.returnNo} />
              <Field label="Return Date" name="returnDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Refund Method</span>
                <select name="refundMethod" defaultValue="cash" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="store_credit">Store Credit</option>
                </select>
              </label>
            </div>
            <div className="mt-3">
              <Field label="Reason" name="reason" placeholder="Wrong size, defective, changed mind…" />
            </div>
            <div className="mt-3">
              <Field label="New Sale ID (optional, for exchanges)" name="newSaleId" type="number" placeholder="Numeric ID of the replacement sale, if any" />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-400">Refund Total</div>
                <div className="text-xl font-semibold text-slate-900">{refundTotal.toFixed(2)}</div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending || refundTotal <= 0} size="lg">
              {isPending ? "Processing…" : "Process Return"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
