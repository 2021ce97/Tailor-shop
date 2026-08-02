"use client";

import { useActionState } from "react";
import { createBranch, type BranchFormState } from "@/app/actions/branches";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";

const initialState: BranchFormState = { status: "idle" };

export function BranchForm() {
  const [state, formAction, isPending] = useActionState(createBranch, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">New Branch</h2>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Name" name="name" required error={state.fieldErrors?.name} />
        <Field label="Phone" name="phone" />
        <Field label="Address" name="address" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Add Branch"}
        </Button>
      </div>
    </form>
  );
}
