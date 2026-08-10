"use client";

import { useActionState, useState } from "react";
import { addMeasurementField, deleteMeasurementField, addDesignCategory, deleteDesignCategory, addDesignOption, deleteDesignOption, type GarmentTypeFormState } from "@/app/actions/garment-config";

interface FormProps {
  locale: "en" | "fa" | "ps";
  garmentTypeId: number;
  fields: any[];
  categories: any[];
  options: any[];
  translations: any;
}

export function GarmentConfigForms({ locale, garmentTypeId, fields, categories, options, translations: t }: FormProps) {
  const [addFieldState, addFieldAction, addFieldPending] = useActionState(async (_: GarmentTypeFormState, formData: FormData) => addMeasurementField(garmentTypeId, formData), { status: "idle" });
  const [addCategoryState, addCategoryAction, addCategoryPending] = useActionState(async (_: GarmentTypeFormState, formData: FormData) => addDesignCategory(garmentTypeId, formData), { status: "idle" });

  return (
    <>
      {/* Measurement Fields Add Form */}
      <details className="bg-slate-50 border border-slate-200 rounded p-4 mt-4">
        <summary className="cursor-pointer font-medium text-slate-900">{t.addMeasurementField}</summary>
        <form action={addFieldAction} className="mt-4 space-y-3">
          {addFieldState.message && (
            <p className={`rounded-md px-4 py-3 text-sm ${addFieldState.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {addFieldState.message}
            </p>
          )}
          <input type="text" name="code" placeholder="Field code (e.g., height, shoulder)" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
          <input type="text" name="labelFa" placeholder="Dari label" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
          <input type="text" name="labelPs" placeholder="Pashto label" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
          <input type="text" name="unit" placeholder="Unit (e.g., inch, cm)" defaultValue="inch" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isRequired" className="w-4 h-4" />
            <span className="text-sm text-slate-700">{t.isRequired}</span>
          </label>
          <button type="submit" disabled={addFieldPending} className="text-sm rounded-md bg-slate-900 text-white px-3 py-1.5 hover:bg-slate-800 disabled:opacity-50">
            {addFieldPending ? "…" : t.addMeasurementField}
          </button>
        </form>
      </details>

      {/* Design Category Add Form */}
      <details className="bg-slate-50 border border-slate-200 rounded p-4 mt-6">
        <summary className="cursor-pointer font-medium text-slate-900">{t.addDesignCategory}</summary>
        <form action={addCategoryAction} className="mt-4 space-y-3">
          {addCategoryState.message && (
            <p className={`rounded-md px-4 py-3 text-sm ${addCategoryState.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {addCategoryState.message}
            </p>
          )}
          <input type="text" name="code" placeholder="Category code (e.g., collar, pocket)" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
          <input type="text" name="labelFa" placeholder="Dari label" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
          <input type="text" name="labelPs" placeholder="Pashto label" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isRequired" className="w-4 h-4" />
            <span className="text-sm text-slate-700">{t.isRequired}</span>
          </label>
          <button type="submit" disabled={addCategoryPending} className="text-sm rounded-md bg-slate-900 text-white px-3 py-1.5 hover:bg-slate-800 disabled:opacity-50">
            {addCategoryPending ? "…" : t.addDesignCategory}
          </button>
        </form>
      </details>

      {/* Design Option Forms (per category) */}
      {categories.map((cat) => {
        const catOptions = options.filter((opt) => opt.categoryId === cat.id);
        return (
          <CategoryOptions key={cat.id} locale={locale} category={cat} options={catOptions} t={t} />
        );
      })}

      {/* Delete Forms */}
      {fields.map((f) => (
        <DeleteMeasurementField key={`field-${f.id}`} fieldId={f.id} fieldName={f.labelFa} />
      ))}
      {categories.map((cat) => (
        <DeleteDesignCategory key={`cat-${cat.id}`} categoryId={cat.id} categoryName={cat.labelFa} />
      ))}
    </>
  );
}

function CategoryOptions({ locale, category, options, t }: { locale: string; category: any; options: any[]; t: any }) {
  const [state, action, pending] = useActionState(async (_: GarmentTypeFormState, formData: FormData) => addDesignOption(category.id, formData), { status: "idle" });

  return (
    <div key={category.id} className="mt-4 space-y-2 bg-slate-50 border border-slate-200 rounded p-3">
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-slate-900 flex items-center justify-between">
          <span>{category.labelFa}</span>
          <span className="text-xs text-slate-500">({options.length} options)</span>
        </summary>
        <div className="mt-3 space-y-2">
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {options.map((opt) => (
                <DeleteDesignOption key={`opt-${opt.id}`} optionId={opt.id} optionName={opt.labelFa} />
              ))}
            </div>
          )}
          <form action={action} className="space-y-2">
            {state.message && (
              <p className={`rounded-md px-3 py-2 text-xs ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                {state.message}
              </p>
            )}
            <input type="text" name="labelFa" placeholder="Dari" className="w-full px-2 py-1 text-xs border border-slate-300 rounded" required />
            <input type="text" name="labelPs" placeholder="Pashto" className="w-full px-2 py-1 text-xs border border-slate-300 rounded" required />
            <button type="submit" disabled={pending} className="text-xs bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-50">
              {pending ? "…" : t.addDesignOption}
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}

function DeleteMeasurementField({ fieldId, fieldName }: { fieldId: number; fieldName: string }) {
  const [, action] = useActionState(async () => deleteMeasurementField(fieldId), { status: "idle" });
  
  return (
    <form action={action} className="inline hidden">
      <input type="hidden" name="fieldId" value={fieldId} />
      <button type="submit" className="text-xs text-red-600 hover:text-red-800" title={`Delete ${fieldName}`}>×</button>
    </form>
  );
}

function DeleteDesignCategory({ categoryId, categoryName }: { categoryId: number; categoryName: string }) {
  const [, action] = useActionState(async () => deleteDesignCategory(categoryId), { status: "idle" });
  
  return (
    <form action={action} className="inline hidden">
      <input type="hidden" name="categoryId" value={categoryId} />
      <button type="submit" className="text-xs text-red-600 hover:text-red-800" title={`Delete ${categoryName}`}>×</button>
    </form>
  );
}

function DeleteDesignOption({ optionId, optionName }: { optionId: number; optionName: string }) {
  const [, action] = useActionState(async () => deleteDesignOption(optionId), { status: "idle" });
  
  return (
    <form action={action} className="inline">
      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-2">
        {optionName}
        <button type="submit" className="text-blue-600 hover:text-blue-900 font-bold">×</button>
      </span>
    </form>
  );
}
