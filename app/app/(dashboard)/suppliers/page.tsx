import { db, suppliers } from "@/lib/db";
import { desc } from "drizzle-orm";
import { SupplierForm } from "./supplier-form";

export default async function SuppliersPage() {
  const rows = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt)).limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Suppliers</h1>
        <p className="text-sm text-slate-500 mt-0.5">Fabric wholesalers and ready-made garment suppliers.</p>
      </div>
      <SupplierForm />
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Phone</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No suppliers yet.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{s.type ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.phone ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
