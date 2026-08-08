import { NextRequest, NextResponse } from "next/server";
import { db, tailorOrders, customers, fabrics, shopSettings } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq } from "drizzle-orm";
import { generateInvoicePdf, type InvoicePdfInput } from "@/lib/pdf/invoice-pdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const [order] = await db.select().from(tailorOrders).where(eq(tailorOrders.id, orderId));
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const [shop] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
  const customer = await db.select().from(customers).where(eq(customers.id, order.customerId)).then((r) => r[0]);
  const fabric = order.fabricId ? await db.select().from(fabrics).where(eq(fabrics.id, order.fabricId)).then((r) => r[0]) : undefined;

  const lineItems: { label: string; amount: number }[] = [
    { label: "Stitching Charge", amount: Number(order.stitchingCharge) },
  ];
  if (Number(order.fabricCharge) > 0) lineItems.push({ label: "Fabric Charge", amount: Number(order.fabricCharge) });
  if (Number(order.otherCharges) > 0) lineItems.push({ label: "Other Charges", amount: Number(order.otherCharges) });

  const input: InvoicePdfInput = {
    shopName: shop?.shopName ?? "Clothes & Tailor Shop",
    shopAddress: shop?.address ?? undefined,
    shopPhone: shop?.phone ?? undefined,
    shopEmail: shop?.email ?? undefined,
    logoUrl: shop?.logoUrl ?? undefined,

    documentTypeLabel: order.orderKind === "alteration" ? "Alteration Invoice" : "Tailor Order Invoice",
    documentNo: order.orderNo,
    documentDate: order.orderDate,
    status: order.status,

    partyLabel: "Customer",
    partyName: customer?.name ?? "—",
    partyPhone: customer?.phone ?? undefined,
    partyEmail: customer?.email ?? undefined,

    fields: [
      { label: "Garment", value: order.garmentType },
      { label: "Fabric", value: order.fabricSource === "customer_provided" ? "Customer provided" : (fabric?.name ?? "—") },
      { label: "Promised Date", value: order.promisedDate ?? "" },
      { label: "Current Stage", value: order.currentStage.replace(/_/g, " ") },
    ],
    lineItems,
    discount: Number(order.discount) > 0 ? Number(order.discount) : undefined,
    totalAmount: Number(order.totalAmount),
    amountPaid: Number(order.advancePaid),
    balanceDue: Number(order.balanceDue),
    notes: order.styleNotes ?? undefined,
    currencyCode: shop?.currency ?? undefined,
  };

  const pdfBytes = await generateInvoicePdf(input);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.orderNo}.pdf"`,
    },
  });
}
