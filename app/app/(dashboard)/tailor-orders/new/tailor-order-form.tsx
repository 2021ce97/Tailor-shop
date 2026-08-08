"use client";

import { useActionState, useMemo, useState } from "react";
import { submitTailorOrder, type TailorOrderFormState } from "@/app/actions/tailor-orders";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { SearchableSelect, type SearchableOption } from "@/components/shared/searchable-select";
import { InlineMeasurementModal } from "@/components/orders/inline-measurement-modal";
import { Plus } from "lucide-react";
import type { TranslationSet } from "@/lib/i18n";

const initialState: TailorOrderFormState = { status: "idle" };

const garmentTypes = ["shirt", "pant", "suit", "kurta", "dress", "coat", "other"];

interface MeasurementProfileOption {
  value: number;
  customerId: number;
  label: string;
  takenAt: string;
}

export function TailorOrderForm({
  customers: initialCustomers,
  fabrics,
  measurementProfiles: initialProfiles,
  templates,
  translations: t,
}: {
  customers: SearchableOption[];
  fabrics: (SearchableOption & { costPerUnit: number; unit: string })[];
  measurementProfiles: MeasurementProfileOption[];
  templates: Record<string, string[]>;
  translations: TranslationSet;
}) {
  const [state, formAction, isPending] = useActionState(submitTailorOrder, initialState);

  // Modal state
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  // Dynamic customer and profile lists
  const [customers, setCustomers] = useState<SearchableOption[]>(initialCustomers);
  const [measurementProfiles, setMeasurementProfiles] = useState<MeasurementProfileOption[]>(initialProfiles);

  const [fabricSource, setFabricSource] = useState<"shop" | "customer_provided">("shop");
  const [stitchingCharge, setStitchingCharge] = useState(0);
  const [fabricCharge, setFabricCharge] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const customerProfiles = selectedCustomerId
    ? measurementProfiles.filter((profile) => profile.customerId === selectedCustomerId)
    : [];

  const total = useMemo(
    () => stitchingCharge + fabricCharge + otherCharges - discount,
    [stitchingCharge, fabricCharge, otherCharges, discount]
  );
  const balanceDue = useMemo(() => total - advancePaid, [total, advancePaid]);

  const handleMeasurementSave = (profile: { id: number; label: string; garmentType: string }) => {
    const newProfile: MeasurementProfileOption = {
      value: profile.id,
      customerId: selectedCustomerId!,
      label: profile.label || `${profile.garmentType} measurement`,
      takenAt: new Date().toISOString().split("T")[0],
    };
    setMeasurementProfiles((prev) => [...prev, newProfile]);
    setSelectedProfileId(profile.id);
  };

  const saveCustomerAutomatically = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim() || selectedCustomerId || isSavingCustomer) return;
    setIsSavingCustomer(true);
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName, phone: newCustomerPhone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save customer");
      const option = { value: result.id, label: result.name, sublabel: result.phone ?? undefined };
      setCustomers((prev) => prev.some((customer) => customer.value === option.value) ? prev : [...prev, option]);
      setSelectedCustomerId(result.id);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  return (
    <>
      <form action={formAction} className="space-y-6">
        {state.status === "success" && (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800">
            {state.message}
          </div>
        )}
        {state.status === "error" && state.message && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">
            <p>{state.message}</p>
            {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs">
                {Object.entries(state.fieldErrors).map(([field, errors]) => (
                  <li key={field}>
                    {field.replace(/([A-Z])/g, " ")}: {errors[0]}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">{t.orderDetails}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">{t.orderId}</span>
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
                {t.generatedOnSave}
              </div>
              <input type="hidden" name="orderNo" value="" />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">{t.orderKind}</span>
              <select
                name="orderKind"
                defaultValue="custom"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              >
                <option value="custom">{t.custom}</option>
                <option value="alteration">{t.alteration}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">{t.garmentType}</span>
              <select
                name="garmentType"
                defaultValue="shirt"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              >
                {garmentTypes.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label={t.orderDate}
              name="orderDate"
              type="date"
              required
              error={state.fieldErrors?.orderDate}
            />
            <Field label={t.promisedDate} name="promisedDate" type="date" />
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">{t.customerMeasurements}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <input type="hidden" name="customerId" value={selectedCustomerId ?? ""} />
                <SearchableSelect
                  name="existingCustomerId"
                  label={t.customer}
                  options={customers}
                  error={state.fieldErrors?.customerId}
                  onSelect={(customer) => setSelectedCustomerId(customer?.value ?? null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Field label={t.newCustomerName} name="newCustomerName" value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} onBlur={saveCustomerAutomatically} />
              <Field label={t.contactNumber} name="newCustomerPhone" type="tel" value={newCustomerPhone} onChange={(event) => setNewCustomerPhone(event.target.value)} onBlur={saveCustomerAutomatically} />
              {isSavingCustomer && <p className="text-xs text-slate-400">Saving customer...</p>}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">{t.measurementProfile}</span>
                  <select
                    key={selectedCustomerId ?? "none"}
                    name="measurementProfileId"
                    value={selectedProfileId ?? ""}
                    onChange={(e) => setSelectedProfileId(e.target.value ? Number(e.target.value) : null)}
                    disabled={!selectedCustomerId || customerProfiles.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {!selectedCustomerId
                        ? t.selectCustomer
                        : customerProfiles.length === 0
                        ? t.noSavedProfiles
                        : t.noProfileForOrder}
                    </option>
                    {customerProfiles.map((profile) => (
                      <option key={profile.value} value={profile.value}>
                        {profile.label} ({profile.takenAt})
                      </option>
                    ))}
                  </select>
                  {state.fieldErrors?.measurementProfileId?.[0] && (
                    <span className="text-xs text-red-500">
                      {state.fieldErrors.measurementProfileId[0]}
                    </span>
                  )}
                </label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowMeasurementModal(true)}
                className="mt-6"
                title="Add new measurements"
                disabled={!selectedCustomerId}
              >
                <Plus className="size-4" />
              </Button>
            </div>

          </div>
          <p className="text-xs text-slate-400 mt-2">
            Click the + button to quickly add a new customer or measurement without leaving this form.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">{t.fabric}</h2>
          <div className="grid grid-cols-3 gap-4 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">{t.fabricSource}</span>
              <select
                name="fabricSource"
                value={fabricSource}
                onChange={(e) => setFabricSource(e.target.value as "shop" | "customer_provided")}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              >
                <option value="shop">{t.fromShopStock}</option>
                <option value="customer_provided">{t.customerProvided}</option>
              </select>
            </label>
            {fabricSource === "shop" && (
              <>
                <SearchableSelect name="fabricId" label="Fabric" options={fabrics} />
                <Field label={t.quantityUsed} name="fabricQtyUsed" type="number" step="0.01" />
              </>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">{t.pricingAdvance}</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field
              label={t.stitchingCharge}
              name="stitchingCharge"
              type="number"
              step="0.01"
              required
              onChange={(e) => setStitchingCharge(Number(e.target.value) || 0)}
            />
            <Field
              label={t.fabricCharge}
              name="fabricCharge"
              type="number"
              step="0.01"
              onChange={(e) => setFabricCharge(Number(e.target.value) || 0)}
            />
            <Field
              label={t.otherCharges}
              name="otherCharges"
              type="number"
              step="0.01"
              onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
            />
            <Field
              label={t.discount}
              name="discount"
              type="number"
              step="0.01"
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
            <Field
              label={t.advancePaid}
              name="advancePaid"
              type="number"
              step="0.01"
              onChange={(e) => setAdvancePaid(Number(e.target.value) || 0)}
            />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">{t.advancePaymentMethod}</span>
              <select
                name="advancePaymentMethod"
                defaultValue="cash"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              >
                <option value="cash">{t.cash}</option>
                <option value="bank">{t.bank}</option>
              </select>
            </label>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400">{t.totalAmount}</div>
              <div className="font-semibold text-slate-900">{total.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t.advancePaid}</div>
              <div className="font-semibold text-slate-900">{advancePaid.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t.balanceDue}</div>
              <div className="font-semibold text-slate-900">{balanceDue.toFixed(2)}</div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <Field label={t.styleNotes} name="styleNotes" placeholder="Collar style, buttons, fit preferences…" />
          <div className="mt-3">
            <Field label={t.internalNotes} name="notes" />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="reset" variant="outline">
            {t.clear}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t.creating : t.createOrder}
          </Button>
        </div>
      </form>

      {selectedCustomerId && (
        <InlineMeasurementModal
          isOpen={showMeasurementModal}
          onClose={() => setShowMeasurementModal(false)}
          customerId={selectedCustomerId}
          templates={templates}
          onSave={handleMeasurementSave}
        />
      )}
    </>
  );
}
