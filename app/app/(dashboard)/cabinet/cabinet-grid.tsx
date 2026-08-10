"use client";

import { useState } from "react";
import { getStoredGarments, removeGarmentFromStorage } from "@/app/actions/cabinet";
import type { storageLocations } from "@/lib/db";

interface CabinetGridProps {
  locale: "en" | "fa" | "ps";
  locations: any[];
  t: Record<string, string>;
}

export function CabinetGrid({ locale, locations, t }: CabinetGridProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [storedGarments, setStoredGarments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleLocationClick(locationId: number) {
    setLoading(true);
    try {
      const garments = await getStoredGarments(locationId);
      setStoredGarments(garments);
      setSelectedLocationId(locationId);
    } catch (error) {
      console.error("Failed to load garments:", error);
    } finally {
      setLoading(false);
    }
  }

  const getOccupancyColor = (occupied: number, capacity: number) => {
    const percent = (occupied / capacity) * 100;
    if (percent === 0) return "bg-emerald-50 border-emerald-200";
    if (percent < 70) return "bg-blue-50 border-blue-200";
    if (percent < 100) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  const getOccupancyTextColor = (occupied: number, capacity: number) => {
    const percent = (occupied / capacity) * 100;
    if (percent === 0) return "text-emerald-700";
    if (percent < 70) return "text-blue-700";
    if (percent < 100) return "text-amber-700";
    return "text-red-700";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Storage Grid */}
      <div className="lg:col-span-2">
        <h2 className="mb-4 font-semibold text-slate-900">
          {locale === "ps" ? "خزانې" : "خانه‌های ذخیره‌گاه"}
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() => handleLocationClick(location.id)}
              className={`aspect-square rounded-lg border-2 p-4 text-center transition-colors ${
                selectedLocationId === location.id ? "ring-2 ring-slate-900" : ""
              } ${getOccupancyColor(location.occupiedGarments, location.capacityGarments)}`}
            >
              <div className="mb-2 text-sm font-bold text-slate-900">{location.code}</div>
              <div className={`text-xs font-semibold ${getOccupancyTextColor(location.occupiedGarments, location.capacityGarments)}`}>
                {location.occupiedGarments}/{location.capacityGarments}
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{
                    width: `${Math.min(100, (location.occupiedGarments / location.capacityGarments) * 100)}%`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-emerald-100 border border-emerald-200" />
            <span>{locale === "ps" ? "خالي" : "خالی"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-blue-100 border border-blue-200" />
            <span>{locale === "ps" ? "جزیی" : "جزئی"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-amber-100 border border-amber-200" />
            <span>{locale === "ps" ? "تقریباً پوره" : "تقریباً پر"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-100 border border-red-200" />
            <span>{locale === "ps" ? "پوره" : "پر"}</span>
          </div>
        </div>
      </div>

      {/* Stored Garments Details */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-4 font-semibold text-slate-900">
          {selectedLocationId
            ? `${locations.find((l) => l.id === selectedLocationId)?.code} ${locale === "ps" ? "جامې" : "لباس‌ها"}`
            : locale === "ps"
              ? "خانه وټاکئ"
              : "خانه را انتخاب کنید"}
        </h3>

        {loading ? (
          <div className="text-center text-sm text-slate-500">
            {locale === "ps" ? "لاډ کېږي..." : "در حال بارگذاری..."}
          </div>
        ) : storedGarments.length === 0 ? (
          <div className="text-center text-sm text-slate-500">
            {selectedLocationId
              ? locale === "ps"
                ? "کوم جامه نه ده"
                : "هیچ لباسی موجود نیست"
              : locale === "ps"
                ? "لاړ کړئ"
                : "..."}
          </div>
        ) : (
          <div className="space-y-2">
            {storedGarments.map((garment) => (
              <div key={garment.assignmentId} className="rounded bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-mono font-semibold text-slate-900">
                      {garment.ticketNo}
                    </div>
                    <div className="text-xs text-slate-500">
                      {garment.garmentType?.nameFa || "—"}
                    </div>
                  </div>
                  <RemoveGarmentButton
                    garmentItemId={garment.garmentItemId}
                    ticketNo={garment.ticketNo}
                    locale={locale}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RemoveGarmentButton({
  garmentItemId,
  ticketNo,
  locale,
}: {
  garmentItemId: number;
  ticketNo: string;
  locale: "en" | "fa" | "ps";
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleRemove() {
    if (!confirm(locale === "ps" ? "ډاډ یاست؟" : "آیا مطمئن هستید؟")) return;
    setIsPending(true);
    try {
      const result = await removeGarmentFromStorage(garmentItemId);
      if (result.status === "error") {
        alert(result.message);
      }
    } catch (error) {
      alert(locale === "ps" ? "خرابي" : "خطا");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="ml-2 text-xs text-red-600 hover:text-red-900 disabled:opacity-50"
    >
      {isPending ? "…" : "×"}
    </button>
  );
}
