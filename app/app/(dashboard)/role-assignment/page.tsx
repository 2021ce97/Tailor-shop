import { createSystemUser } from "@/app/actions/garment-management";
import { db, roles, users } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";

export default async function RoleAssignmentPage() {
  const session = await requireSession(); const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const [roleRows, userRows] = await Promise.all([db.select().from(roles).orderBy(asc(roles.name)), db.select({ id: users.id, name: users.name, email: users.email, roleId: users.roleId, status: users.status }).from(users).where(eq(users.branchId, session.branchId))]);
  const text = locale === "ps" ? { title: "د واکونو ټاکنه", add: "نوی کارن", name: "نوم", email: "برېښنالیک", password: "پټ نوم", role: "رول" } : { title: "تعیین صلاحیت‌ها", add: "کاربر جدید", name: "نام", email: "ایمیل", password: "رمز عبور", role: "نقش" };
  return <div className="space-y-6"><div><h1 className="text-xl font-semibold">{text.title}</h1><p className="text-sm text-slate-500">{locale === "ps" ? "یوازې مدیرانو او هغو کارکوونکو ته د ننوتلو حساب ورکړئ چې اړتیا ورته لري." : "تنها برای مدیران یا کارکنانی که نیاز دارند حساب ورود ایجاد کنید."}</p></div><form action={createSystemUser} className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-5"><input required name="name" placeholder={text.name} className="rounded border p-2"/><input required name="email" type="email" placeholder={text.email} className="rounded border p-2"/><input required name="password" type="password" placeholder={text.password} className="rounded border p-2"/><select required name="roleId" className="rounded border p-2"><option value="">{text.role}</option>{roleRows.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><button className="rounded bg-slate-900 px-3 py-2 text-white">{text.add}</button></form><div className="mobile-table-scroll rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs"><tr><th className="p-3">{text.name}</th><th>{text.email}</th><th className="p-3">{text.role}</th></tr></thead><tbody>{userRows.map((user) => <tr key={user.id} className="border-t"><td className="p-3">{user.name}</td><td>{user.email}</td><td className="p-3">{roleRows.find((role) => role.id === user.roleId)?.name}</td></tr>)}</tbody></table></div></div>;
}
