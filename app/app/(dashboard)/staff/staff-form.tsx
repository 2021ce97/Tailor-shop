"use client";

import { useActionState } from "react";
import { createStaffMember, type StaffFormState } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";

const initialState: StaffFormState = { status: "idle" };

export function StaffForm() {
  const [state, formAction, isPending] = useActionState(createStaffMember, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Add Tailor / Cutter</h2>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Full Name" name="name" required error={state.fieldErrors?.name} />
        <Field label="Email" name="email" type="email" required error={state.fieldErrors?.email} />
        <Field label="Temporary Password" name="password" type="password" required error={state.fieldErrors?.password} />
        <Field label="Phone" name="phone" />
        <Field label="Daily Wage" name="dailyWage" type="number" min="0" step="0.01" error={state.fieldErrors?.dailyWage} />
        <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
          <input name="isTailorStaff" type="checkbox" defaultChecked className="size-4" />
          Available for tailor/cutter assignment
        </label>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>{isPending ? "Adding…" : "Add Staff Member"}</Button>
      </div>
    </form>
  );
}
