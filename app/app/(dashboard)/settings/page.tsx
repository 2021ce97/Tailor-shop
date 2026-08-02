import { db, shopSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const [shop] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Shop Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Shown on invoices and used as defaults across the system.</p>
      </div>
      <SettingsForm
        shopName={shop?.shopName ?? ""}
        address={shop?.address ?? null}
        phone={shop?.phone ?? null}
        email={shop?.email ?? null}
        currency={shop?.currency ?? "PKR"}
        taxPercent={shop?.taxPercent ?? "0"}
      />
    </div>
  );
}
