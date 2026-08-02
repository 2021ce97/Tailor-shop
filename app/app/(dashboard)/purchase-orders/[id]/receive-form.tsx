"use client";

import { useActionState, useMemo, useState } from "react";
import { submitReceivePurchaseOrder, type ReceiveFormState } from "@/app/actions/purchase-orders";
import { Button } from "@/components/ui/button";

const initialState: ReceiveFormState = { status: "idle" };

interface PoLine {
  id: number;
  label: string;
  quantity: number;
  receivedQty: number;
  unitCost: number;
}

export function ReceiveForm({ purchaseOrderId, lines }: { purchaseOrderId: number; lines: PoLine[] }) {
  const [state, formAction, isPending] = useActionState(submitReceivePurchaseOrder, initialState);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, string>>({});

  const linesJson = JSON.stringify(
    lines
      .map((l) => ({ poItemId: l.id, receiveQty: Number(receiveQtys[l.id]) || 0 }))
      .filter((l) => l.receiveQty > 0)
  );

  const pendingLines = lines.filter((l) => l.quantity - l.receivedQty > 0.001);

  if (pendingLines.length === 0) {
    return <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">Everything on this order has been received.</div>;
  }

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Receive Stock</h2>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}

      <input type="hidden" name="purchaseOrderId" value={purchaseOrderId} />
      <input type="hidden" name="linesJson" value={linesJson} />

      <div className="space-y-2">
        {pendingLines.map((l) => {
          const remaining = l.quantity - l.receivedQty;
          return (
            <div key={l.id} className="grid grid-cols-12 gap-2 items-center text-sm">
              <div className="col-span-6 text-slate-700">{l.label}</div>
              <div className="col-span-3 text-slate-400 text-xs">Remaining: {remaining.toFixed(2)}</div>
              <input
                type="number"
                step="0.01"
                max={remaining}
                min={0}
                value={receiveQtys[l.id] ?? ""}
                onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [l.id]: e.target.value }))}
                placeholder="0"
                className="col-span-3 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none"
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Receiving…" : "Receive"}
        </Button>
      </div>
    </form>
  );
}
