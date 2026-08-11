import { requireSession } from "@/lib/auth/get-session";
import { getLocale } from "@/lib/i18n";
import { cookies } from "next/headers";
import { getStorageLocationsWithOccupancy } from "@/app/actions/cabinet";
import { CabinetGrid } from "./cabinet-grid";
import { addStorageLocation, removeStorageLocation, syncReadyGarmentsToCabinet } from "@/app/actions/garment-management";

export default async function CabinetPage() {
  const session = await requireSession();
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);

  const locations = await getStorageLocationsWithOccupancy(session.branchId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-orange-50 via-slate-50 to-amber-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {locale === "ps" ? "د جامو المارۍ (کابینت)" : "کابینت لباس‌ها"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {locale === "ps"
            ? "جامې انتقال کړئ، حالت وګورئ، ظرفیت کنترول کړئ"
            : "جامه‌ها را منتقل کنید، وضعیت را مشاهده کنید، ظرفیت را کنترول کنید"}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Manage cabinets</h2>
        <p className="mt-1 text-sm text-slate-500">A ready garment is placed automatically in the first cabinet with space. Remove a cabinet only after it is empty.</p>
        <form action={addStorageLocation} className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
          <input required name="code" placeholder="Cabinet name, e.g. A1" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required name="capacityGarments" min="1" type="number" placeholder="Capacity" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">Add cabinet</button>
        </form>
        {locations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={syncReadyGarmentsToCabinet}>
              <button className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Sync ready garments</button>
            </form>
            {locations.map((location) => <form key={location.id} action={removeStorageLocation}><input type="hidden" name="locationId" value={location.id} /><button title={location.occupiedGarments ? "Empty this cabinet before removing it" : "Remove cabinet"} disabled={location.occupiedGarments > 0} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Remove {location.code}</button></form>)}
          </div>
        )}
      </section>

      {/* Storage Grid */}
      {locations.length > 0 ? (
        <CabinetGrid locale={locale} locations={locations} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-slate-600">
            {locale === "ps" ? "کوم خانه دموجود نه ده" : "هیچ خانه‌ای موجود نیست"}
          </p>
        </div>
      )}
    </div>
  );
}
