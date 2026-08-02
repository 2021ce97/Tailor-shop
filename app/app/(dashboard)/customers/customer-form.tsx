"use client";

import { useActionState } from "react";
import { createCustomer, type CustomerFormState } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";

const initialState: CustomerFormState = { status: "idle" };

export function CustomerForm() {
  const [state, formAction, isPending] = useActionState(createCustomer, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">New Customer</h2>

      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
          {state.message}
        </div>
      )}
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" name="name" required error={state.fieldErrors?.name} />
        <Field label="Phone" name="phone" />
        <Field label="Email" name="email" type="email" error={state.fieldErrors?.email} />
      </div>
      <Field label="Address" name="address" />

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Add Customer"}
        </Button>
      </div>
    </form>
  );
}
