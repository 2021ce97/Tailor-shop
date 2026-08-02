import { db, branches } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { desc } from "drizzle-orm";
import { BranchForm } from "./branch-form";

export default async function BranchesPage() {
  const session = await requireSession();
  const canManage = session.roleName === "owner" || session.roleName === "manager";

  const rows = await db.select().from(branches).orderBy(desc(branches.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Branches</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Every sale, order, and stock item belongs to a branch. Staff work in their assigned branch; owners and
          managers can switch branches from the header.
        </p>
      </div>

      {canManage && <BranchForm />}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Phone</th>
              <th className="px-4 py-2.5">Address</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  {b.name} {b.isMain && <span className="text-xs text-slate-400 font-normal">(main)</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{b.phone ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{b.address ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
