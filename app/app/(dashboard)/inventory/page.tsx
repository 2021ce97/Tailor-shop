import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

interface LowStockRow {
  [key: string]: unknown;
  item_kind: string;
  item_id: number;
  item_name: string;
  current_qty: string;
  reorder_level: string;
}

export default async function InventoryPage() {
  // low_stock_view is defined in db/migrations/005_reporting_views.sql
  const rows = await db.execute<LowStockRow>(sql`SELECT * FROM low_stock_view ORDER BY item_kind, item_name`);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Inventory Alerts</h1>
        <p className="text-sm text-slate-500 mt-0.5">Retail variants and fabric currently at or below their reorder level.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Kind</th>
              <th className="px-4 py-2.5">Item</th>
              <th className="px-4 py-2.5 text-right">Current Qty</th>
              <th className="px-4 py-2.5 text-right">Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Nothing is low on stock right now.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-600 capitalize">{r.item_kind}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{r.item_name}</td>
                <td className="px-4 py-2.5 text-right text-red-600 font-medium">{r.current_qty}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{r.reorder_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
