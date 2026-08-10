import { db, garmentTypes, garmentMeasurementFields, garmentDesignCategories, garmentDesignOptions } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";
import Link from "next/link";

export default async function GarmentConfigPage() {
  const t = getTranslations(getLocale((await cookies()).get("tailor_locale")?.value));
  const types = await db.select().from(garmentTypes).orderBy(desc(garmentTypes.sortOrder));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-purple-50 via-slate-50 to-pink-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t.garmentConfig}</h1>
        <p className="text-sm text-slate-600 mt-1">Create and manage garment types with their measurements and design options</p>
      </div>

      {types.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
          <p className="text-slate-500">{t.noGarmentTypes}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {types.map((gt) => (
            <GarmentTypeCard key={gt.id} garmentType={gt} translations={t} />
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/garment-config/new" className="text-sm rounded-md border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50 font-medium">
          + {t.addGarmentType}
        </Link>
      </div>
    </div>
  );
}

async function GarmentTypeCard({ garmentType, translations: t }: any) {
  const [fields, categories] = await Promise.all([
    db.select().from(garmentMeasurementFields).where(eq(garmentMeasurementFields.garmentTypeId, garmentType.id)).orderBy(desc(garmentMeasurementFields.sortOrder)),
    db.select().from(garmentDesignCategories).where(eq(garmentDesignCategories.garmentTypeId, garmentType.id)).orderBy(desc(garmentDesignCategories.sortOrder)),
  ]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{garmentType.nameFa}</h2>
            <p className="text-sm text-slate-600">{garmentType.namePs} • {garmentType.code}</p>
          </div>
          <Link href={`/garment-config/${garmentType.id}`} className="text-sm rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">
            {t.editGarmentType}
          </Link>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Measurement Fields */}
        <div>
          <h3 className="text-sm font-medium text-slate-900 mb-2">{t.measurementFields}</h3>
          {fields.length === 0 ? (
            <p className="text-xs text-slate-500">No fields configured</p>
          ) : (
            <div className="space-y-1">
              {fields.map((f: any) => (
                <div key={f.id} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">{f.labelFa}</span>
                  <span className="text-slate-400">({f.unit})</span>
                  {f.isRequired && <span className="text-red-600 font-semibold">*</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Design Categories */}
        <div>
          <h3 className="text-sm font-medium text-slate-900 mb-2">{t.designCategories}</h3>
          {categories.length === 0 ? (
            <p className="text-xs text-slate-500">No categories configured</p>
          ) : (
            <div className="space-y-1">
              {categories.map((c: any) => (
                <div key={c.id} className="text-xs text-slate-600">
                  <span className="inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded">{c.labelFa}</span>
                  {c.isRequired && <span className="text-red-600 font-semibold ml-1">*</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
