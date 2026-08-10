import { db, customers, garmentDesignCategories, garmentDesignOptions, garmentMeasurementFields, garmentTypes } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";
import { GarmentOrderForm } from "./garment-order-form";

export default async function NewTailorOrderPage() {
  const session = await requireSession();
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const t = getTranslations(locale);
  const [customerRows, typeRows, fieldRows, categoryRows, optionRows] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, phone: customers.phone, code: customers.customerCode }).from(customers).where(eq(customers.status, "active")),
    db.select().from(garmentTypes).where(eq(garmentTypes.isActive, true)).orderBy(asc(garmentTypes.sortOrder)),
    db.select().from(garmentMeasurementFields).orderBy(asc(garmentMeasurementFields.sortOrder)),
    db.select().from(garmentDesignCategories).orderBy(asc(garmentDesignCategories.sortOrder)),
    db.select().from(garmentDesignOptions).where(eq(garmentDesignOptions.isActive, true)).orderBy(asc(garmentDesignOptions.sortOrder)),
  ]);
  const types = typeRows.map((type) => ({
    id: type.id, code: type.code, name: locale === "ps" ? type.namePs : type.nameFa,
    fields: fieldRows.filter((field) => field.garmentTypeId === type.id).map((field) => ({ code: field.code, label: locale === "ps" ? field.labelPs : field.labelFa, unit: field.unit, required: field.isRequired })),
    categories: categoryRows.filter((category) => category.garmentTypeId === type.id).map((category) => ({ code: category.code, label: locale === "ps" ? category.labelPs : category.labelFa, required: category.isRequired, options: optionRows.filter((option) => option.categoryId === category.id).map((option) => ({ value: String(option.id), label: locale === "ps" ? option.labelPs : option.labelFa })) })),
  }));
  return <GarmentOrderForm locale={locale} title={`${t.newOrder} — ${session.branchName}`} customers={customerRows.map((row) => ({ value: row.id, label: row.name, sublabel: [row.phone, row.code].filter(Boolean).join(" · ") }))} garmentTypes={types} />;
}
