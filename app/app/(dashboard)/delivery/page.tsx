import { deliverReadyOrder } from "@/app/actions/garment-management";
import { customers, db, garmentStorageAssignments, storageLocations, tailorOrderItems, tailorOrders } from "@/lib/db";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";

export default async function DeliveryPage() {
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);
  const rows = await db
    .select({ itemId: tailorOrderItems.id, ticketNo: tailorOrderItems.ticketNo, orderId: tailorOrders.id, orderNo: tailorOrders.orderNo, customer: customers.name, phone: customers.phone, due: tailorOrders.balanceDue, paid: tailorOrders.advancePaid, promisedDate: tailorOrders.promisedDate, location: storageLocations.code })
    .from(tailorOrderItems)
    .innerJoin(tailorOrders, eq(tailorOrders.id, tailorOrderItems.tailorOrderId))
    .innerJoin(customers, eq(customers.id, tailorOrders.customerId))
    .leftJoin(garmentStorageAssignments, and(eq(garmentStorageAssignments.garmentItemId, tailorOrderItems.id), isNull(garmentStorageAssignments.removedAt)))
    .leftJoin(storageLocations, eq(storageLocations.id, garmentStorageAssignments.storageLocationId))
    .where(eq(tailorOrderItems.currentStage, "ready"));

  const grouped = Array.from(rows.reduce((map, row) => {
    const current = map.get(row.orderId);
    if (current) { current.tickets.push(row.ticketNo); if (row.location) current.locations.add(row.location); }
    else map.set(row.orderId, { ...row, tickets: [row.ticketNo], locations: new Set(row.location ? [row.location] : []) });
    return map;
  }, new Map<number, { orderId: number; orderNo: string; customer: string; phone: string | null; due: string; paid: string; promisedDate: string | null; itemId: number; tickets: string[]; locations: Set<string> }>()).values());

  const text = locale === "ps"
    ? { title: "د جامو سپارل", help: "یوازې هغه فرمایشونه دلته ښکاري چې ټول لباسونه یې چمتو او په کابینت کې وي.", order: "فرمایش", ticket: "ټکټونه", customer: "پېرېدونکی", due: "پاتې پیسې", collect: "اوس ترلاسه شوې", deliver: "سپارل", receipt: "رسید PDF", location: "الماری", paid: "رسید" }
    : { title: "Garment delivery", help: "Only orders with every garment ready are shown. Collect the remaining balance, then deliver the whole order once.", order: "Order", ticket: "Garments", customer: "Customer", due: "Balance due", collect: "Collect now", deliver: "Deliver order", receipt: "PDF receipt", location: "Cabinet", paid: "Paid" };

  return <div className="space-y-5">
    <div><h1 className="text-xl font-semibold text-slate-900">{text.title}</h1><p className="mt-1 text-sm text-slate-500">{text.help}</p></div>
    <div className="mobile-table-scroll rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500"><tr><th className="px-4 py-3">{text.order}</th><th className="px-4 py-3">{text.ticket}</th><th className="px-4 py-3">{text.customer}</th><th className="px-4 py-3">{text.location}</th><th className="px-4 py-3">{text.due}</th><th className="px-4 py-3" /></tr></thead>
        <tbody>{grouped.map((row) => <tr key={row.orderId} className="border-t border-slate-200"><td className="px-4 py-3 font-medium text-slate-900">{row.orderNo}<div className="text-xs text-slate-400">{row.promisedDate ?? "—"}</div></td><td className="px-4 py-3 text-slate-700">{row.tickets.join(", ")}</td><td className="px-4 py-3"><div className="font-medium text-slate-900">{row.customer}</div><div className="text-xs text-slate-400">{row.phone ?? "—"}</div></td><td className="px-4 py-3 text-slate-600">{Array.from(row.locations).join(", ") || "—"}</td><td className="px-4 py-3 text-slate-700"><div>{Number(row.due ?? 0).toFixed(2)} AFN</div><div className="text-xs text-slate-400">{text.paid}: {Number(row.paid ?? 0).toFixed(2)} AFN</div></td><td className="px-4 py-3"><form action={deliverReadyOrder} className="flex flex-wrap items-center justify-end gap-2"><input type="hidden" name="garmentItemId" value={row.itemId} /><input name="balanceCollected" min="0" max={Number(row.due ?? 0)} step="0.01" type="number" defaultValue={Number(row.due ?? 0)} className="w-28 rounded border border-slate-300 px-2 py-1 text-sm" aria-label={text.collect} /><select name="paymentMethod" className="rounded border border-slate-300 px-2 py-1 text-sm"><option value="cash">Cash</option><option value="bank">Bank</option></select><button className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">{text.deliver}</button><a className="text-xs font-medium text-slate-600 underline" target="_blank" href={`/api/tailor-orders/${row.orderId}/pdf`}>{text.receipt}</a></form></td></tr>)}</tbody>
      </table>
      {grouped.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No ready orders. Quality approval places garments into a cabinet automatically.</p>}
    </div>
  </div>;
}
