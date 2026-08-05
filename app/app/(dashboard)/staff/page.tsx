import { db, users } from "@/lib/db";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/get-session";
import { StaffForm } from "./staff-form";

export default async function StaffPage() {
  const session = await requireSession();
  const canManage = session.roleName === "owner" || session.roleName === "manager";
  if (!canManage) notFound();

  const staff = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, dailyWage: users.dailyWage, isTailorStaff: users.isTailorStaff, status: users.status })
    .from(users)
    .where(and(eq(users.branchId, session.branchId), eq(users.status, "active")))
    .orderBy(asc(users.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Staff — {session.branchName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Add staff here, then select tailor/cutter staff while creating a new order.</p>
      </div>
      <StaffForm />
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500"><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Phone</th><th className="px-4 py-2.5">Assignment</th><th className="px-4 py-2.5 text-right">Daily Wage</th></tr></thead>
          <tbody>
            {staff.map((member) => <tr key={member.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-2.5 font-medium text-slate-900">{member.name}</td><td className="px-4 py-2.5 text-slate-600">{member.email}</td><td className="px-4 py-2.5 text-slate-600">{member.phone || "—"}</td><td className="px-4 py-2.5 text-slate-600">{member.isTailorStaff ? "Tailor / Cutter" : "Staff"}</td><td className="px-4 py-2.5 text-right text-slate-600">{member.dailyWage ? Number(member.dailyWage).toFixed(2) : "—"}</td></tr>)}
            {staff.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No staff yet. Add a tailor or cutter above.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
