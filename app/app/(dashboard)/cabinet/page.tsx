import { requireSession } from "@/lib/auth/get-session";
import { getLocale, getTranslations } from "@/lib/i18n";
import { cookies } from "next/headers";
import { getStorageLocationsWithOccupancy } from "@/app/actions/cabinet";
import { CabinetGrid } from "./cabinet-grid";

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
          {locale === "ps" ? "د جامو المارۍ (کابینت)" : "کابینت لباس‌ها"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {locale === "ps"
            ? "جامې انتقال کړئ، حالت وګورئ، ظرفیت کنترول کړئ"
            : "جامه‌ها را منتقل کنید، وضعیت را مشاهده کنید، ظرفیت را کنترول کنید"}
        </p>
      </div>

      {/* Storage Grid */}
      {locations.length > 0 ? (
        <CabinetGrid locale={locale} locations={locations} t={t} />
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
