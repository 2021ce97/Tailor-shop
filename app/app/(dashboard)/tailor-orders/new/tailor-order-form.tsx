"use client";

import { useActionState, useMemo, useState } from "react";
import { submitTailorOrder, type TailorOrderFormState } from "@/app/actions/tailor-orders";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { SearchableSelect, type SearchableOption } from "@/components/shared/searchable-select";

const initialState: TailorOrderFormState = { status: "idle" };

const garmentTypes = ["shirt", "pant", "suit", "kurta", "dress", "coat", "other"];

interface MeasurementProfileOption {
  value: number;
  customerId: number;
  label: string;
  takenAt: string;
}

export function TailorOrderForm({
  customers,
  fabrics,
  tailorStaff,
  measurementProfiles,
}: {
  customers: SearchableOption[];
  fabrics: (SearchableOption & { costPerUnit: number; unit: string })[];
  tailorStaff: SearchableOption[];
  measurementProfiles: MeasurementProfileOption[];
}) {
  const [state, formAction, isPending] = useActionState(submitTailorOrder, initialState);

  const [fabricSource, setFabricSource] = useState<"shop" | "customer_provided">("shop");
  const [stitchingCharge, setStitchingCharge] = useState(0);
  const [fabricCharge, setFabricCharge] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const customerProfiles = selectedCustomerId
    ? measurementProfiles.filter((profile) => profile.customerId === selectedCustomerId)
    : [];

  const total = useMemo(
    () => stitchingCharge + fabricCharge + otherCharges - discount,
    [stitchingCharge, fabricCharge, otherCharges, discount]
  );
  const balanceDue = useMemo(() => total - advancePaid, [total, advancePaid]);

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800">
          {state.message}
        </div>
      )}
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">{state.message}</div>
      )}

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Order details</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Order No" name="orderNo" required error={state.fieldErrors?.orderNo} />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Order Kind</span>
            <select name="orderKind" defaultValue="custom" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400">
              <option value="custom">Custom (new garment)</option>
              <option value="alteration">Alteration</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Garment Type</span>
            <select name="garmentType" defaultValue="shirt" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400">
              {garmentTypes.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <Field label="Order Date" name="orderDate" type="date" required error={state.fieldErrors?.orderDate} />
          <Field label="Promised Date" name="promisedDate" type="date" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Customer &amp; staff</h2>
        <div className="grid grid-cols-3 gap-4">
          <SearchableSelect
            name="customerId"
            label="Customer"
            options={customers}
            required
            error={state.fieldErrors?.customerId}
            onSelect={(customer) => setSelectedCustomerId(customer?.value ?? null)}
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Measurement Profile</span>
            <select
              key={selectedCustomerId ?? "none"}
              name="measurementProfileId"
              defaultValue=""
              disabled={!selectedCustomerId || customerProfiles.length === 0}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {!selectedCustomerId ? "Select a customer first" : customerProfiles.length === 0 ? "No saved profiles" : "No profile for this order"}
              </option>
              {customerProfiles.map((profile) => (
                <option key={profile.value} value={profile.value}>
                  {profile.label} ({profile.takenAt})
                </option>
              ))}
            </select>
          </label>
          <SearchableSelect name="assignedTailorId" label="Assigned Tailor" options={tailorStaff} />
          <SearchableSelect name="assignedCutterId" label="Assigned Cutter" options={tailorStaff} />
        </div>
        <p className="text-xs text-slate-400 mt-2">Saved profiles are filtered to the selected customer and attached to the order when chosen.</p>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Fabric</h2>
        <div className="grid grid-cols-3 gap-4 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Fabric Source</span>
            <select
              name="fabricSource"
              value={fabricSource}
              onChange={(e) => setFabricSource(e.target.value as "shop" | "customer_provided")}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            >
              <option value="shop">From shop stock</option>
              <option value="customer_provided">Customer provided</option>
            </select>
          </label>
          {fabricSource === "shop" && (
            <>
              <SearchableSelect name="fabricId" label="Fabric" options={fabrics} />
              <Field label="Quantity Used" name="fabricQtyUsed" type="number" step="0.01" />
            </>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Pricing &amp; advance</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Stitching Charge" name="stitchingCharge" type="number" step="0.01" required onChange={(e) => setStitchingCharge(Number(e.target.value) || 0)} />
          <Field label="Fabric Charge" name="fabricCharge" type="number" step="0.01" onChange={(e) => setFabricCharge(Number(e.target.value) || 0)} />
          <Field label="Other Charges" name="otherCharges" type="number" step="0.01" onChange={(e) => setOtherCharges(Number(e.target.value) || 0)} />
          <Field label="Discount" name="discount" type="number" step="0.01" onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
          <Field label="Advance Paid" name="advancePaid" type="number" step="0.01" onChange={(e) => setAdvancePaid(Number(e.target.value) || 0)} />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Advance Payment Method</span>
            <select name="advancePaymentMethod" defaultValue="cash" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400">
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </label>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Total Amount</div>
            <div className="font-semibold text-slate-900">{total.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Advance Paid</div>
            <div className="font-semibold text-slate-900">{advancePaid.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Balance Due</div>
            <div className="font-semibold text-slate-900">{balanceDue.toFixed(2)}</div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <Field label="Style Notes" name="styleNotes" placeholder="Collar style, buttons, fit preferences…" />
        <div className="mt-3">
          <Field label="Internal Notes" name="notes" />
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="reset" variant="outline">
          Clear
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create Order"}
        </Button>
      </div>
    </form>
  );
}
