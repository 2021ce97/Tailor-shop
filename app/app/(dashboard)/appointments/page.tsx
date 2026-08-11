import { db, appointments, customers } from "@/lib/db";
import { eq, asc, gte, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { AppointmentForm } from "./appointment-form";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";

export default async function AppointmentsPage() {
  const session = await requireSession();
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const t = getTranslations(locale);

  const [customerRows, upcoming] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(eq(customers.status, "active")),
    db
      .select({
        id: appointments.id,
        appointmentType: appointments.appointmentType,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        customerName: customers.name,
      })
      .from(appointments)
      .innerJoin(customers, eq(customers.id, appointments.customerId))
      .where(and(gte(appointments.scheduledAt, new Date(new Date().getTime() - 24 * 60 * 60 * 1000)), eq(appointments.branchId, session.branchId)))
      .orderBy(asc(appointments.scheduledAt))
      .limit(50),
  ]);

  const customerOptions = customerRows.map((c) => ({ value: c.id, label: c.name, sublabel: c.phone ?? undefined }));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-amber-50 via-slate-50 to-orange-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t.appointments} — {session.branchName}</h1>
        <p className="text-sm text-slate-600 mt-1">{t.appointmentHelp}</p>
      </div>

      <AppointmentForm customers={customerOptions} translations={t} />

      <div className="bg-white border border-slate-200 rounded-lg mobile-table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">{t.dateTime}</th>
              <th className="px-4 py-2.5">{t.customer}</th>
              <th className="px-4 py-2.5">{t.type}</th>
              <th className="px-4 py-2.5">{t.duration}</th>
              <th className="px-4 py-2.5">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  {t.noUpcomingAppointments}
                </td>
              </tr>
            )}
            {upcoming.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-900">{new Date(a.scheduledAt).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-slate-600">{a.customerName}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{a.appointmentType}</td>
                <td className="px-4 py-2.5 text-slate-600">{a.durationMinutes} min</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
