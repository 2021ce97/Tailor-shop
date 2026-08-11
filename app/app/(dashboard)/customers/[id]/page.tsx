import Link from "next/link";
import { db, customers, measurementProfiles, measurementTemplates, tailorOrders } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MeasurementForm } from "./measurement-form";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "@/lib/i18n";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const t = getTranslations(locale);
  const text = locale === "en"
    ? { allCustomers: "All customers", noContact: "No contact number on file", measurementProfiles: "Measurement Profiles", noProfiles: "No measurement profiles yet.", tailorOrders: "Tailor Orders", orderNo: "Order No", noTailorOrders: "No tailor orders yet." }
    : locale === "fa"
      ? { allCustomers: "تمام مشتریان", noContact: "شماره تماس ثبت نشده است", measurementProfiles: "پروفایل‌های اندازه‌گیری", noProfiles: "هنوز پروفایل اندازه‌گیری وجود ندارد.", tailorOrders: "سفارش‌های خیاطی", orderNo: "شماره سفارش", noTailorOrders: "هنوز سفارش خیاطی وجود ندارد." }
      : { allCustomers: "ټول پېرېدونکي", noContact: "د اړیکې شمېره نه ده ثبت شوې", measurementProfiles: "د اندازو پروفایلونه", noProfiles: "تر اوسه د اندازې پروفایل نشته.", tailorOrders: "د خیاطۍ سپارښتنې", orderNo: "د سپارښتنې شمېره", noTailorOrders: "تر اوسه د خیاطۍ سپارښتنه نشته." };

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) notFound();

  const [profiles, orders, templateRows] = await Promise.all([
    db.select().from(measurementProfiles).where(eq(measurementProfiles.customerId, customerId)).orderBy(desc(measurementProfiles.createdAt)),
    db.select().from(tailorOrders).where(eq(tailorOrders.customerId, customerId)).orderBy(desc(tailorOrders.createdAt)).limit(20),
    db.select().from(measurementTemplates).orderBy(desc(measurementTemplates.createdAt)),
  ]);
  const templates = Object.fromEntries(templateRows.map((template) => [template.garmentType, template.fields as string[]]));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/customers" className="text-xs text-slate-400 hover:text-slate-600">
          ← {text.allCustomers}
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 mt-1">{customer.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {customer.phone || text.noContact}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{text.measurementProfiles}</h2>
        <div className="grid grid-cols-1 gap-3 mb-4">
          {profiles.length === 0 && (
            <p className="text-sm text-slate-400 bg-white border border-slate-200 rounded-lg px-4 py-6 text-center">
              {text.noProfiles}
            </p>
          )}
          {profiles.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900 capitalize">
                  {p.garmentType} {p.label ? `— ${p.label}` : ""}
                </span>
                <span className="text-xs text-slate-400">{p.takenAt}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {Object.entries(p.measurements as Record<string, string>).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-slate-400 capitalize">{k.replace(/_/g, " ")}</div>
                    <div className="font-medium text-slate-900">{v || "—"}</div>
                  </div>
                ))}
              </div>
              {p.notes && <p className="text-xs text-slate-500 mt-2">{p.notes}</p>}
            </div>
          ))}
        </div>
        <MeasurementForm customerId={customerId} templates={templates} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{text.tailorOrders}</h2>
        <div className="bg-white border border-slate-200 rounded-lg mobile-table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2">{text.orderNo}</th>
                <th className="px-4 py-2">{t.garment}</th>
                <th className="px-4 py-2">{t.stage}</th>
                <th className="px-4 py-2 text-right">{t.balanceDue}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    {text.noTailorOrders}
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <Link href={`/tailor-orders/${o.id}`} className="hover:underline">
                      {o.orderNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 capitalize">{o.garmentType}</td>
                  <td className="px-4 py-2 text-slate-600 capitalize">{o.currentStage.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{Number(o.balanceDue).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <a href={`/api/tailor-orders/${o.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-900 underline">
                      {t.pdf}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
