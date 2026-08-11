import { requireSession } from "@/lib/auth/get-session";
import { getLocale, getTranslations } from "@/lib/i18n";
import { cookies } from "next/headers";
import { getStorageLocationsWithOccupancy } from "@/app/actions/cabinet";
import { CabinetGrid } from "./cabinet-grid";
import { addStorageLocation, removeStorageLocation, syncReadyGarmentsToCabinet } from "@/app/actions/garment-management";

export default async function CabinetPage() {
  const session = await requireSession();
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const t = getTranslations(locale);

  const locations = await getStorageLocationsWithOccupancy(session.branchId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-orange-50 via-slate-50 to-amber-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {t.cabinet}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {locale === "en" ? "View ready garments, cabinet capacity, and storage locations." : locale === "fa" ? "لباس‌های آماده، ظرفیت الماری و محل نگهداری را مشاهده کنید." : "چمتو لباسونه، د المارۍ ظرفیت او د ساتلو ځایونه وګورئ."}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">{t.manageCabinets}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.cabinetHelp}</p>
        <form action={addStorageLocation} className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
          <input required name="code" placeholder={t.cabinetNamePlaceholder} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required name="capacityGarments" min="1" type="number" placeholder={t.capacity} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">{t.addCabinet}</button>
        </form>
        {locations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={syncReadyGarmentsToCabinet}>
              <button className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{t.syncReadyGarments}</button>
            </form>
            {locations.map((location) => <form key={location.id} action={removeStorageLocation}><input type="hidden" name="locationId" value={location.id} /><button title={location.occupiedGarments ? t.emptyCabinetBeforeRemoving : `${t.removeCabinet} ${location.code}`} disabled={location.occupiedGarments > 0} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">{t.removeCabinet} {location.code}</button></form>)}
          </div>
        )}
      </section>

      {/* Storage Grid */}
      {locations.length > 0 ? (
        <CabinetGrid locale={locale} locations={locations} translations={t} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-slate-600">
            {t.noCabinets}
          </p>
        </div>
      )}
    </div>
  );
}
