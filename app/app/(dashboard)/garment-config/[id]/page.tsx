import { db, garmentTypes, garmentMeasurementFields, garmentDesignCategories, garmentDesignOptions } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function GarmentTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));
  
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
                          <form action={async () => { "use server"; }} method="POST" className="inline">
                            <input type="hidden" name="fieldId" value={f.id} />
                            <button type="submit" className="text-xs text-red-600 hover:text-red-800">{t.delete}</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <details className="bg-slate-50 border border-slate-200 rounded p-4">
              <summary className="cursor-pointer font-medium text-slate-900">{t.addMeasurementField}</summary>
              <form action={async () => { "use server"; }} method="POST" className="mt-4 space-y-3">
                <input type="hidden" name="garmentTypeId" value={garmentType.id} />
                <input type="text" name="code" placeholder="Field code" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
                <input type="text" name="labelFa" placeholder="Dari label" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
                <input type="text" name="labelPs" placeholder="Pashto label" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
                <input type="text" name="unit" placeholder="Unit (e.g., inch, cm)" defaultValue="inch" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" />
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="isRequired" className="w-4 h-4" />
                  <span className="text-sm text-slate-700">{t.isRequired}</span>
                </label>
                <button type="submit" className="text-sm rounded-md bg-slate-900 text-white px-3 py-1.5 hover:bg-slate-800">{t.addMeasurementField}</button>
              </form>
            </details>
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
                        <form action={async () => { "use server"; }} method="POST" className="inline">
                          <input type="hidden" name="categoryId" value={cat.id} />
                          <button type="submit" className="text-xs text-red-600 hover:text-red-800">{t.delete}</button>
                        </form>
                      </div>

                      {catOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {catOptions.map((opt) => (
                            <span key={opt.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {opt.labelFa}
                            </span>
                          ))}
                        </div>
                      )}

                      <details className="text-xs">
                        <summary className="cursor-pointer text-slate-600 hover:text-slate-900">{t.addDesignOption}</summary>
                        <form action={async () => { "use server"; }} method="POST" className="mt-2 space-y-2">
                          <input type="hidden" name="categoryId" value={cat.id} />
                          <input type="text" name="labelFa" placeholder="Dari" className="w-full px-2 py-1 text-xs border border-slate-300 rounded" required />
                          <input type="text" name="labelPs" placeholder="Pashto" className="w-full px-2 py-1 text-xs border border-slate-300 rounded" required />
                          <button type="submit" className="text-xs bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-800">{t.addDesignOption}</button>
                        </form>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}

            <details className="bg-slate-50 border border-slate-200 rounded p-4">
              <summary className="cursor-pointer font-medium text-slate-900">{t.addDesignCategory}</summary>
              <form action={async () => { "use server"; }} method="POST" className="mt-4 space-y-3">
                <input type="hidden" name="garmentTypeId" value={garmentType.id} />
                <input type="text" name="code" placeholder="Category code" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
                <input type="text" name="labelFa" placeholder="Dari label" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
                <input type="text" name="labelPs" placeholder="Pashto label" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md" required />
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="isRequired" className="w-4 h-4" />
                  <span className="text-sm text-slate-700">{t.isRequired}</span>
                </label>
                <button type="submit" className="text-sm rounded-md bg-slate-900 text-white px-3 py-1.5 hover:bg-slate-800">{t.addDesignCategory}</button>
              </form>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
