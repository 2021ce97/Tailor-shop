import Link from "next/link";
import { db, customers } from "@/lib/db";
import { desc } from "drizzle-orm";
import { CustomerForm } from "./customer-form";

export default async function CustomersPage() {
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500 mt-0.5">Click a customer to view or add their measurement profiles.</p>
      </div>

      <CustomerForm />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Phone</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No customers yet.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/customers/${c.id}`} className="font-medium text-slate-900 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{c.phone ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{c.email ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
