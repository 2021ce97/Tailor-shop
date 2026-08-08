"use client";

import { useState } from "react";
import { createMeasurementTemplate } from "@/app/actions/measurement-templates";
import { Button } from "@/components/ui/button";

export function MeasurementTemplateManager({ garmentType, fields }: { garmentType: string; fields: string[] }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState(fields);
  const [message, setMessage] = useState("");

  function addCategory() {
    const value = category.trim().toLowerCase().replace(/\s+/g, "_");
    if (value && !categories.includes(value)) setCategories((current) => [...current, value]);
    setCategory("");
  }

  async function save() {
    try {
      const formData = new FormData();
      formData.set("garmentType", garmentType);
      formData.set("name", name);
      formData.set("fieldsJson", JSON.stringify(categories));
      await createMeasurementTemplate(formData);
      setMessage("Template saved.");
      setName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save template.");
    }
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
      <p className="text-xs font-medium text-slate-600">Save these categories as a reusable template</p>
      <div className="flex gap-2">
        <input value={category} onChange={(event) => setCategory(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addCategory())} placeholder="Add category: chest, pant size..." className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm" />
        <Button type="button" variant="outline" size="sm" onClick={addCategory}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">{categories.map((item) => <span key={item} className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-600">{item.replace(/_/g, " ")}</span>)}</div>
      <div className="flex gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Template name, e.g. Summer Shirt" className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm" />
        <Button type="button" size="sm" onClick={save}>Save Template</Button>
      </div>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}
