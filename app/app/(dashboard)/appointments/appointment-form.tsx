"use client";

import { useActionState } from "react";
import { createAppointment, type AppointmentFormState } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { SearchableSelect, type SearchableOption } from "@/components/shared/searchable-select";

const initialState: AppointmentFormState = { status: "idle" };

export function AppointmentForm({ customers }: { customers: SearchableOption[] }) {
  const [state, formAction, isPending] = useActionState(createAppointment, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Schedule Appointment</h2>
      {state.status === "success" && <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">{state.message}</div>}
      {state.status === "error" && state.message && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>}
      <div className="grid grid-cols-3 gap-4">
        <SearchableSelect name="customerId" label="Customer" options={customers} required error={state.fieldErrors?.customerId} />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Type</span>
          <select name="appointmentType" defaultValue="fitting" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none">
            <option value="measurement">Measurement</option>
            <option value="fitting">Fitting</option>
            <option value="consultation">Consultation</option>
          </select>
        </label>
        <Field label="Date &amp; Time" name="scheduledAt" type="datetime-local" required error={state.fieldErrors?.scheduledAt} />
        <Field label="Duration (minutes)" name="durationMinutes" type="number" defaultValue={30} />
      </div>
      <Field label="Notes" name="notes" />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Scheduling…" : "Schedule"}
        </Button>
      </div>
    </form>
  );
}
