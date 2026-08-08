"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { MeasurementTemplateManager } from "./measurement-template-manager";

interface InlineMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  templates?: Record<string, string[]>;
  onSave: (profile: { id: number; label: string; garmentType: string }) => void;
}

const measurementFields = {
  shirt: ["chest", "waist", "shoulder", "sleeve", "length", "neck"],
  pant: ["waist", "hip", "inseam", "outseam", "thigh", "calf"],
  suit: ["chest", "waist", "shoulder", "sleeve", "jacket_length", "pant_waist", "pant_inseam"],
  kurta: ["chest", "shoulder", "sleeve", "length", "neck"],
  dress: ["bust", "waist", "hip", "length", "shoulder"],
  coat: ["chest", "waist", "shoulder", "sleeve", "length"],
  other: [],
};

function formatLabel(field: string): string {
  return field
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function InlineMeasurementModal({
  isOpen,
  onClose,
  customerId,
  templates = {},
  onSave,
}: InlineMeasurementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [garmentType, setGarmentType] = useState<string>("shirt");
  const [fields, setFields] = useState<string[]>(templates.shirt ?? measurementFields.shirt);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const selectedGarmentType = formData.get("garmentType") as string;
    const label = formData.get("label") as string;
    const notes = formData.get("notes") as string;

    const measurements: Record<string, number> = {};
    const selectedFields = templates[selectedGarmentType] ?? measurementFields[selectedGarmentType as keyof typeof measurementFields] ?? [];
    
    for (const field of selectedFields) {
      const value = formData.get(field) as string;
      if (value) {
        measurements[field] = parseFloat(value);
      }
    }

    const data = {
      customerId,
      garmentType: selectedGarmentType,
      measurements,
      label: label || null,
      notes: notes || null,
    };

    try {
      const response = await fetch("/api/measurement-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create measurement profile");
      }

      const profile = await response.json();
      onSave(profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Measurements">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">
            Garment Type <span className="text-red-500">*</span>
          </span>
          <select
            name="garmentType"
            value={garmentType}
            onChange={(e) => {
              const next = e.target.value;
              setGarmentType(next);
              setFields(templates[next] ?? measurementFields[next as keyof typeof measurementFields] ?? []);
            }}
            required
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            {Object.keys(measurementFields).map((type) => (
              <option key={type} value={type}>
                {formatLabel(type)}
              </option>
            ))}
          </select>
        </label>

        {fields.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => (
              <Field
                key={field}
                label={formatLabel(field)}
                name={field}
                type="number"
                step="0.1"
                placeholder="0.0"
              />
            ))}
          </div>
        )}

        {fields.length === 0 && (
          <div className="text-sm text-slate-500 bg-slate-50 rounded-md px-4 py-3">
            No predefined measurements for &quot;Other&quot; garment type. Add a label and notes below, then
            record custom measurements separately.
          </div>
        )}
        <MeasurementTemplateManager garmentType={garmentType} fields={fields} />

        <Field label="Profile Label (Optional)" name="label" placeholder="e.g., Formal Shirt #1" />

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Notes (Optional)</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Any special instructions or preferences..."
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </label>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Measurements"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
