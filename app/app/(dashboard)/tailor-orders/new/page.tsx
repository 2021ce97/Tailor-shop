import { db, customers, fabrics, measurementProfiles, users } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { TailorOrderForm } from "./tailor-order-form";

export default async function NewTailorOrderPage() {
  const session = await requireSession();

  const [customerRows, fabricRows, staffRows, profileRows] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(eq(customers.status, "active")),
    db
      .select({ id: fabrics.id, name: fabrics.name, color: fabrics.color, unit: fabrics.unit, stockQty: fabrics.stockQty, costPerUnit: fabrics.costPerUnit })
      .from(fabrics)
      .where(and(eq(fabrics.status, "active"), eq(fabrics.branchId, session.branchId))),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.isTailorStaff, true), eq(users.status, "active"), eq(users.branchId, session.branchId))),
    db
      .select({
        id: measurementProfiles.id,
        customerId: measurementProfiles.customerId,
        garmentType: measurementProfiles.garmentType,
        label: measurementProfiles.label,
        takenAt: measurementProfiles.takenAt,
      })
      .from(measurementProfiles)
      .orderBy(desc(measurementProfiles.createdAt)),
  ]);

  const customerOptions = customerRows.map((c) => ({ value: c.id, label: c.name, sublabel: c.phone ?? undefined }));
  const fabricOptions = fabricRows.map((f) => ({
    value: f.id,
    label: `${f.name}${f.color ? ` (${f.color})` : ""}`,
    sublabel: `${f.stockQty} ${f.unit} in stock`,
    costPerUnit: Number(f.costPerUnit),
    unit: f.unit,
  }));
  const staffOptions = staffRows.map((u) => ({ value: u.id, label: u.name }));
  const profileOptions = profileRows.map((p) => ({
    value: p.id,
    customerId: p.customerId,
    label: `${p.garmentType}${p.label ? ` — ${p.label}` : ""}`,
    takenAt: p.takenAt,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Tailor Order — {session.branchName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Only the advance is posted now — income and fabric cost are recognized when the order is delivered.
        </p>
      </div>
      <TailorOrderForm customers={customerOptions} fabrics={fabricOptions} tailorStaff={staffOptions} measurementProfiles={profileOptions} />
    </div>
  );
}
