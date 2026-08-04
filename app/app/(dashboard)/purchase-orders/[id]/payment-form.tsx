"use client";

import { useActionState, useState } from "react";
import { submitSupplierPayment, type SupplierPaymentState } from "@/app/actions/purchase-orders";
import { Button } from "@/components/ui/button";

const initialState: SupplierPaymentState = { status: "idle" };

export function SupplierPaymentForm({ purchaseOrderId, outstanding }: { purchaseOrderId: number; outstanding: number }) {
  const [state, formAction, isPending] = useActionState(submitSupplierPayment, initialState);
  const [amount, setAmount] = useState(outstanding.toFixed(2));

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="purchaseOrderId" value={purchaseOrderId} />
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block">Amount</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max={outstanding}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            name="amount"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
            required
          />
        </label>

        <label className="text-sm text-slate-600">
          <span className="mb-1 block">Payment method</span>
          <select name="paymentMethod" defaultValue="cash" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
          </select>
        </label>

        <label className="text-sm text-slate-600">
          <span className="mb-1 block">Notes</span>
          <input name="notes" placeholder="Optional note" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none" />
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || outstanding <= 0.001}>
          {isPending ? "Recording…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
