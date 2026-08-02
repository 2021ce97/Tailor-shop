"use client";

import { useActionState } from "react";
import { recordOrderPayment, submitDeliverOrder, type PaymentFormState, type DeliverFormState } from "@/app/actions/tailor-orders";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";

const paymentInitial: PaymentFormState = { status: "idle" };
const deliverInitial: DeliverFormState = { status: "idle" };

export function RecordPaymentForm({ tailorOrderId, balanceDue }: { tailorOrderId: number; balanceDue: number }) {
  const [state, formAction, isPending] = useActionState(recordOrderPayment, paymentInitial);

  if (balanceDue <= 0) return null;

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Record a Payment</h3>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{state.message}</div>}
      <input type="hidden" name="tailorOrderId" value={tailorOrderId} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Amount" name="amount" type="number" step="0.01" required />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Method</span>
          <select name="paymentMethod" defaultValue="cash" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
          </select>
        </label>
        <Field label="Date" name="paymentDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Recording…" : "Record Payment"}
        </Button>
      </div>
    </form>
  );
}

export function DeliverOrderForm({ tailorOrderId, balanceDue }: { tailorOrderId: number; balanceDue: number }) {
  const [state, formAction, isPending] = useActionState(submitDeliverOrder, deliverInitial);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Mark Delivered</h3>
      <p className="text-xs text-slate-400">This posts the order's income and any fabric cost.</p>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{state.message}</div>}
      <input type="hidden" name="tailorOrderId" value={tailorOrderId} />
      <div className="grid grid-cols-3 gap-3">
        <Field label={`Collect Now (balance ${balanceDue.toFixed(2)})`} name="balanceCollected" type="number" step="0.01" defaultValue={balanceDue} />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Method</span>
          <select name="paymentMethod" defaultValue="cash" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
          </select>
        </label>
        <Field label="Delivered Date" name="deliveredDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Delivering…" : "Mark Delivered"}
        </Button>
      </div>
    </form>
  );
}
