import { db, garmentTypes, garmentMeasurementFields, garmentDesignCategories, garmentDesignOptions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GarmentConfigForms } from "../garment-config-forms";
import { DeleteFieldButton, DeleteCategoryButton, DeleteOptionButton } from "../delete-buttons";

export default async function GarmentTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const t = getTranslations(locale);
  
  const [garmentType] = await db.select().from(garmentTypes).where(eq(garmentTypes.id, Number(id)));
  if (!garmentType) notFound();

  const [fields, categories] = await Promise.all([
    db.select().from(garmentMeasurementFields).where(eq(garmentMeasurementFields.garmentTypeId, garmentType.id)),
    db.select().from(garmentDesignCategories).where(eq(garmentDesignCategories.garmentTypeId, garmentType.id)),
  ]);

  const categoryIds = categories.map((c) => c.id);
  const options = categoryIds.length > 0 
    ? await db.select().from(garmentDesignOptions).where((col: any) => col.categoryId.inArray(categoryIds))
    : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/garment-config" className="text-xs text-slate-400 hover:text-slate-600">
          ← {t.garmentConfig}
        </Link>
      </div>

      {/* Garment Type Info */}
      <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-slate-200">
          <h1 className="text-lg font-semibold text-slate-900">{garmentType.nameFa}</h1>
          <p className="text-sm text-slate-600">{garmentType.namePs} • {garmentType.code}</p>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Measurement Fields */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">{t.measurementFields}</h2>
            </div>

            {fields.length === 0 ? (
              <p className="text-sm text-slate-500 mb-4">No measurement fields configured</p>
            ) : (
              <div className="bg-slate-50 rounded border border-slate-200 overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white">
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">{t.code}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">{t.labelFa}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">{t.labelPs}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">{t.unit}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">{t.isRequired}</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-100">
                        <td className="px-4 py-2 text-slate-600 font-mono">{f.code}</td>
                        <td className="px-4 py-2 text-slate-900">{f.labelFa}</td>
                        <td className="px-4 py-2 text-slate-900">{f.labelPs}</td>
                        <td className="px-4 py-2 text-slate-600">{f.unit}</td>
                        <td className="px-4 py-2 text-slate-600">{f.isRequired ? "Yes" : "No"}</td>
                        <td className="px-4 py-2 text-right">
                          <DeleteFieldButton fieldId={f.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Design Categories */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">{t.designCategories}</h2>
            </div>

            {categories.length === 0 ? (
              <p className="text-sm text-slate-500 mb-4">No design categories configured</p>
            ) : (
              <div className="space-y-4 mb-4">
                {categories.map((cat) => {
                  const catOptions = options.filter((opt) => opt.categoryId === cat.id);
                  return (
                    <div key={cat.id} className="bg-slate-50 border border-slate-200 rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900">{cat.labelFa}</p>
                          <p className="text-xs text-slate-600">{cat.labelPs}</p>
                        </div>
                        <DeleteCategoryButton categoryId={cat.id} />
                      </div>

                      {catOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {catOptions.map((opt) => (
                            <DeleteOptionButton key={opt.id} optionId={opt.id} optionName={opt.labelFa} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Forms for adding fields and categories */}
          <GarmentConfigForms locale={locale} garmentTypeId={garmentType.id} fields={fields} categories={categories} options={options} translations={t} />
        </div>
      </div>
    </div>
  );
}
