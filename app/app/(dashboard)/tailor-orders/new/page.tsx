import { db, customers, fabrics, measurementProfiles, measurementTemplates } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { TailorOrderForm } from "./tailor-order-form";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";

export default async function NewTailorOrderPage() {
  const session = await requireSession();
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));

  const [customerRows, fabricRows, profileRows, templateRows] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(eq(customers.status, "active")),
    db
      .select({ id: fabrics.id, name: fabrics.name, color: fabrics.color, unit: fabrics.unit, stockQty: fabrics.stockQty, costPerUnit: fabrics.costPerUnit })
      .from(fabrics)
      .where(and(eq(fabrics.status, "active"), eq(fabrics.branchId, session.branchId))),
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
    db.select().from(measurementTemplates).orderBy(desc(measurementTemplates.createdAt)),
  ]);

  const customerOptions = customerRows.map((c) => ({ value: c.id, label: c.name, sublabel: c.phone ?? undefined }));
  const fabricOptions = fabricRows.map((f) => ({
    value: f.id,
    label: `${f.name}${f.color ? ` (${f.color})` : ""}`,
    sublabel: `${f.stockQty} ${f.unit} in stock`,
    costPerUnit: Number(f.costPerUnit),
    unit: f.unit,
  }));
  const profileOptions = profileRows.map((p) => ({
    value: p.id,
    customerId: p.customerId,
    label: `${p.garmentType}${p.label ? ` — ${p.label}` : ""}`,
    takenAt: p.takenAt,
  }));
  const templates = Object.fromEntries(templateRows.map((template) => [template.garmentType, template.fields as string[]]));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-violet-50 via-slate-50 to-fuchsia-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t.newTailorOrder} — {session.branchName}</h1>
        <p className="text-sm text-slate-600 mt-1">
          {t.advanceNotice}
        </p>
      </div>
      <TailorOrderForm customers={customerOptions} fabrics={fabricOptions} measurementProfiles={profileOptions} templates={templates} translations={t} />
    </div>
  );
}
