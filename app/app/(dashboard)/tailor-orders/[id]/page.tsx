import Link from "next/link";
import { notFound } from "next/navigation";
import { db, tailorOrders, tailorOrderStages, customers, users, fabrics, tailorOrderPayments } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { StageAdvancer } from "./stage-advancer";
import { RecordPaymentForm, DeliverOrderForm } from "./order-payment-forms";

export default async function TailorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);

  const [order] = await db.select().from(tailorOrders).where(eq(tailorOrders.id, orderId));
  if (!order) notFound();

  const [customer, stages, payments, fabric, tailor, cutter] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, order.customerId)).then((r) => r[0]),
    db.select().from(tailorOrderStages).where(eq(tailorOrderStages.tailorOrderId, orderId)).orderBy(desc(tailorOrderStages.changedAt)),
    db.select().from(tailorOrderPayments).where(eq(tailorOrderPayments.tailorOrderId, orderId)).orderBy(desc(tailorOrderPayments.createdAt)),
    order.fabricId ? db.select().from(fabrics).where(eq(fabrics.id, order.fabricId)).then((r) => r[0]) : Promise.resolve(undefined),
    order.assignedTailorId ? db.select().from(users).where(eq(users.id, order.assignedTailorId)).then((r) => r[0]) : Promise.resolve(undefined),
    order.assignedCutterId ? db.select().from(users).where(eq(users.id, order.assignedCutterId)).then((r) => r[0]) : Promise.resolve(undefined),
  ]);

  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/tailor-orders" className="text-xs text-slate-400 hover:text-slate-600">
          ← All orders
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-lg font-semibold text-slate-900">{order.orderNo}</h1>
          <div className="flex items-center gap-3">
            <a
              href={`/api/tailor-orders/${order.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs rounded-md border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-50"
            >
              Download Invoice
            </a>
            <span className="text-xs uppercase font-medium text-slate-400">{order.status.replace(/_/g, " ")}</span>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          <Link href={`/customers/${order.customerId}`} className="hover:underline">
            {customer?.name}
          </Link>
          {" · "}
          {order.orderKind} {order.garmentType}
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Current Stage: <span className="capitalize">{order.currentStage.replace(/_/g, " ")}</span></h2>
          {!isDelivered && !isCancelled && <StageAdvancer tailorOrderId={order.id} currentStage={order.currentStage} />}
        </div>
        <div className="mt-4 space-y-2">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 pb-2">
              <span className="capitalize text-slate-700">{s.stage.replace(/_/g, " ")}</span>
              <span className="text-xs text-slate-400">{new Date(s.changedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Order Details</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Order Date</div>
            <div className="text-slate-900">{order.orderDate}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Promised Date</div>
            <div className="text-slate-900">{order.promisedDate ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Delivered Date</div>
            <div className="text-slate-900">{order.deliveredDate ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Fabric</div>
            <div className="text-slate-900">
              {order.fabricSource === "customer_provided" ? "Customer provided" : fabric?.name ?? "—"}
              {order.fabricQtyUsed ? ` (${order.fabricQtyUsed} ${fabric?.unit ?? ""})` : ""}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Tailor</div>
            <div className="text-slate-900">{tailor?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Cutter</div>
            <div className="text-slate-900">{cutter?.name ?? "—"}</div>
          </div>
        </div>
        {order.styleNotes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 mb-1">Style Notes</div>
            <div className="text-sm text-slate-700">{order.styleNotes}</div>
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Billing</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Total Amount</div>
            <div className="font-semibold text-slate-900">{Number(order.totalAmount).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Paid So Far</div>
            <div className="font-semibold text-slate-900">{Number(order.advancePaid).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Balance Due</div>
            <div className={`font-semibold ${Number(order.balanceDue) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {Number(order.balanceDue).toFixed(2)}
            </div>
          </div>
        </div>
        {payments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
            <div className="text-xs text-slate-400 mb-1">Payment History</div>
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {p.paymentDate} · {p.paymentMethod}
                </span>
                <span className="text-slate-900">{Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {!isDelivered && !isCancelled && (
        <>
          <RecordPaymentForm tailorOrderId={order.id} balanceDue={Number(order.balanceDue)} />
          <DeliverOrderForm tailorOrderId={order.id} balanceDue={Number(order.balanceDue)} />
        </>
      )}
    </div>
  );
}
