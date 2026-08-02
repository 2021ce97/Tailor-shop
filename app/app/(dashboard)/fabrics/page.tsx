import { db, fabrics } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { FabricForm, RestockRow } from "./fabric-form";

export default async function FabricsPage() {
  const session = await requireSession();
  const rows = await db.select().from(fabrics).where(eq(fabrics.branchId, session.branchId)).orderBy(desc(fabrics.createdAt)).limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Fabric Inventory — {session.branchName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Fabric consumed by tailor orders is deducted automatically when an order is created.</p>
      </div>

      <FabricForm />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Color</th>
              <th className="px-4 py-2.5 text-right">Stock</th>
              <th className="px-4 py-2.5 text-right">Cost/Unit</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No fabrics yet.
                </td>
              </tr>
            )}
            {rows.map((f) => {
              const low = Number(f.stockQty) <= Number(f.reorderLevel);
              return (
                <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{f.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">{f.fabricType ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{f.color ?? "—"}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${low ? "text-red-600" : "text-slate-900"}`}>
                    {f.stockQty} {f.unit}
                    {low && " ⚠"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{Number(f.costPerUnit).toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <RestockRow fabricId={f.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
