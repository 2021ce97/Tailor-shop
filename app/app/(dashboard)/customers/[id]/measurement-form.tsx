"use client";

import { useActionState, useState } from "react";
import { createMeasurementProfile, type MeasurementFormState } from "@/app/actions/measurements";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { Plus, Trash2 } from "lucide-react";

const initialState: MeasurementFormState = { status: "idle" };

const garmentTypes = ["shirt", "pant", "suit", "kurta", "dress", "coat", "other"] as const;

// Sensible starting points per garment type — the shop can add, remove,
// or rename any of these; the list is just to save typing on the
// common case, not a fixed schema.
const suggestedFields: Record<string, string[]> = {
  shirt: ["chest", "waist", "shoulder", "sleeve_length", "collar", "shirt_length"],
  pant: ["waist", "hip", "inseam", "outseam", "thigh", "bottom"],
  suit: ["chest", "waist", "shoulder", "sleeve_length", "jacket_length", "trouser_waist", "trouser_length"],
  kurta: ["chest", "waist", "shoulder", "sleeve_length", "kurta_length"],
  dress: ["bust", "waist", "hip", "shoulder", "dress_length"],
  coat: ["chest", "shoulder", "sleeve_length", "coat_length"],
  other: [],
};

interface MeasurementField {
  key: string;
  value: string;
}

export function MeasurementForm({ customerId }: { customerId: number }) {
  const [state, formAction, isPending] = useActionState(createMeasurementProfile, initialState);
  const [garmentType, setGarmentType] = useState<(typeof garmentTypes)[number]>("shirt");
  const [fields, setFields] = useState<MeasurementField[]>(
    suggestedFields.shirt.map((k) => ({ key: k, value: "" }))
  );

  function changeGarmentType(type: (typeof garmentTypes)[number]) {
    setGarmentType(type);
    setFields(suggestedFields[type].map((k) => ({ key: k, value: "" })));
  }

  function updateField(index: number, patch: Partial<MeasurementField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function addField() {
    setFields((prev) => [...prev, { key: "", value: "" }]);
  }
  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  const measurementsJson = JSON.stringify(
    fields.reduce<Record<string, string>>((acc, f) => {
      if (f.key.trim()) acc[f.key.trim()] = f.value;
      return acc;
    }, {})
  );

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">New Measurement Profile</h2>

      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
          {state.message}
        </div>
      )}
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{state.message}</div>
      )}

      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="measurementsJson" value={measurementsJson} />

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Garment Type</span>
          <select
            name="garmentType"
            value={garmentType}
            onChange={(e) => changeGarmentType(e.target.value as (typeof garmentTypes)[number])}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            {garmentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <Field label="Label (optional)" name="label" placeholder="e.g. Formal shirt" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-600">Measurements (in inches, or your shop's unit)</span>
          <button type="button" onClick={addField} className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
            <Plus className="size-3.5" /> Add field
          </button>
        </div>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                value={f.key}
                onChange={(e) => updateField(i, { key: e.target.value })}
                placeholder="e.g. chest"
                className="col-span-5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <input
                value={f.value}
                onChange={(e) => updateField(i, { value: e.target.value })}
                placeholder="0"
                className="col-span-6 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <button type="button" onClick={() => removeField(i)} className="col-span-1 flex justify-center text-slate-400 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-xs text-slate-400">No fields yet — click "Add field".</p>}
        </div>
      </div>

      <Field label="Notes" name="notes" placeholder="Fit preferences, special instructions…" />

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Measurement Profile"}
        </Button>
      </div>
    </form>
  );
}
