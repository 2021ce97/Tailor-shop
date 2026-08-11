"use client";

import { useActionState, useMemo, useState } from "react";
import { createGarmentOrder, type GarmentOrderState } from "@/app/actions/garment-orders";
import { SearchableSelect, type SearchableOption } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";

type GarmentType = { id: number; code: string; name: string; fields: { code: string; label: string; unit: string; required: boolean }[]; categories: { code: string; label: string; required: boolean; options: { value: string; label: string }[] }[] };
type Item = { garmentTypeId: number; measurements: Record<string, string>; designs: Record<string, string>; amount: number; notes?: string };
const initial: GarmentOrderState = { status: "idle" };

export function GarmentOrderForm({ locale, title, customers, garmentTypes, fabrics }: { locale: "en" | "fa" | "ps"; title: string; customers: SearchableOption[]; garmentTypes: GarmentType[]; fabrics: { id: number; name: string; color: string | null; unit: string; stockQty: string; sellingPricePerUnit: string }[] }) {
  const [state, action, pending] = useActionState(createGarmentOrder, initial);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState(garmentTypes[0]?.id ?? 0);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [designs, setDesigns] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState(0);
  const [itemNotes, setItemNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const selectedType = garmentTypes.find((type) => type.id === selectedTypeId);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items]);
  const text = locale === "ps" ? { customer: "پېرېدونکی", newCustomer: "نوی پېرېدونکی", phone: "د اړیکې شمېره", add: "جامه زیاتول", items: "جامې", measure: "اندازې", design: "ډیزاین", price: "بیه", date: "نېټه", delivery: "د سپارلو نېټه", advance: "پیشکي", create: "فرمایش ثبتول", notes: "یادښت", fabric: "ټوکر (د دوکان موجودي)", fabricQty: "کارېدونکی مقدار" } : { customer: "مشتری", newCustomer: "مشتری جدید", phone: "شماره تماس", add: "افزودن لباس", items: "لباس‌ها", measure: "اندازه‌ها", design: "طرح و دیزاین", price: "قیمت", date: "تاریخ", delivery: "تاریخ تحویل", advance: "پیش‌پرداخت", create: "ثبت فرمایش", notes: "یادداشت", fabric: "پارچه (موجودی فروشگاه)", fabricQty: "مقدار مصرف" };
  function addItem() {
    if (!selectedType) return;
    const missing = selectedType.fields.find((field) => field.required && !measurements[field.code]);
    if (missing) return;
    setItems((current) => [...current, { garmentTypeId: selectedType.id, measurements, designs, amount, notes: itemNotes || undefined }]);
    setMeasurements({}); setDesigns({}); setAmount(0); setItemNotes("");
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-violet-50 via-slate-50 to-fuchsia-50 p-6 shadow-sm"><h1 className="text-xl font-semibold text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-600">{locale === "ps" ? "اندازې او ډیزاین ثبت کړئ، بیا هر لباس ته جلا ټکټ ورکړئ." : "اندازه و دیزاین را ثبت کنید؛ هر لباس شماره جداگانه دریافت می‌کند."}</p></div>
    <form action={action} className="space-y-5">
      <input type="hidden" name="customerId" value={customerId ?? ""} /><input type="hidden" name="itemsJson" value={JSON.stringify(items)} />
      {state.message && <p className={`rounded-md px-4 py-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{state.message}</p>}
      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-3">
        <SearchableSelect name="customerSearch" label={text.customer} options={customers} onSelect={(option) => setCustomerId(option?.value ?? null)} placeholder={locale === "ps" ? "نوم، ټیلیفون یا کوډ ولټوئ" : "نام، تماس یا کد را جستجو کنید"} />
        <label className="flex flex-col gap-1 text-sm"><span>{text.newCustomer}</span><input name="newCustomerName" className="rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span>{text.phone}</span><input name="newCustomerPhone" className="rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span>{text.date}</span><input required name="orderDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span>{text.delivery}</span><input name="promisedDate" type="date" className="rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span>{text.advance}</span><input name="advancePaid" min="0" step="0.01" type="number" defaultValue="0" className="rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span>{text.fabric}</span><select name="fabricId" defaultValue="" className="rounded-md border border-slate-300 px-3 py-2"><option value="">Customer provides fabric</option>{fabrics.filter((fabric) => Number(fabric.stockQty) > 0).map((fabric) => <option key={fabric.id} value={fabric.id}>{fabric.name}{fabric.color ? ` · ${fabric.color}` : ""} ({fabric.stockQty} {fabric.unit})</option>)}</select></label>
        <label className="flex flex-col gap-1 text-sm"><span>{text.fabricQty}</span><input name="fabricQtyUsed" min="0" step="0.01" type="number" placeholder="0" className="rounded-md border border-slate-300 px-3 py-2" /></label>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex flex-wrap items-end gap-3"><label className="flex min-w-52 flex-col gap-1 text-sm"><span>{locale === "ps" ? "د جامو ډول" : "نوع لباس"}</span><select value={selectedTypeId} onChange={(event) => { setSelectedTypeId(Number(event.target.value)); setMeasurements({}); setDesigns({}); }} className="rounded-md border border-slate-300 px-3 py-2">{garmentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label className="flex w-32 flex-col gap-1 text-sm"><span>{text.price}</span><input value={amount || ""} onChange={(event) => setAmount(Number(event.target.value) || 0)} type="number" min="0" step="0.01" className="rounded-md border border-slate-300 px-3 py-2" /></label><Button type="button" onClick={addItem}>{text.add}</Button></div>
        {selectedType && <div className="grid gap-5 lg:grid-cols-2"><div><h2 className="mb-3 text-sm font-semibold">{text.measure}</h2><div className="grid grid-cols-2 gap-3">{selectedType.fields.map((field) => <label key={field.code} className="flex flex-col gap-1 text-sm"><span>{field.label}{field.required ? " *" : ""}</span><input value={measurements[field.code] ?? ""} onChange={(event) => setMeasurements((current) => ({ ...current, [field.code]: event.target.value }))} placeholder={field.unit} className="rounded-md border border-slate-300 px-3 py-2" /></label>)}</div></div><div><h2 className="mb-3 text-sm font-semibold">{text.design}</h2><div className="grid grid-cols-2 gap-3">{selectedType.categories.map((category) => <label key={category.code} className="flex flex-col gap-1 text-sm"><span>{category.label}{category.required ? " *" : ""}</span><select value={designs[category.code] ?? ""} onChange={(event) => setDesigns((current) => ({ ...current, [category.code]: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2"><option value="">—</option>{category.options.map((option) => <option key={option.value} value={option.label}>{option.label}</option>)}</select></label>)}</div></div></div>}
        <label className="mt-4 flex flex-col gap-1 text-sm"><span>{text.notes}</span><input value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" /></label>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex justify-between"><h2 className="font-semibold">{text.items}</h2><strong>{total.toFixed(2)} AFN</strong></div>{items.length === 0 ? <p className="text-sm text-slate-500">{locale === "ps" ? "لږ تر لږه یوه جامه اضافه کړئ." : "حداقل یک لباس اضافه کنید."}</p> : <div className="space-y-2">{items.map((item, index) => <div key={index} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"><span>{garmentTypes.find((type) => type.id === item.garmentTypeId)?.name}</span><span>{item.amount.toFixed(2)} AFN <button type="button" className="ms-3 text-red-600" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></span></div>)}</div>}</section>
      <label className="flex max-w-xl flex-col gap-1 text-sm"><span>{text.notes}</span><input name="notes" className="rounded-md border border-slate-300 px-3 py-2" /></label>
      <input type="hidden" name="paymentMethod" value="cash" /><Button type="submit" disabled={pending || items.length === 0}>{pending ? "…" : text.create}</Button>
    </form>
  </div>;
}
