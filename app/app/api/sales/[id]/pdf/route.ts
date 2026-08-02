import { NextRequest, NextResponse } from "next/server";
import { db, sales, saleItems, productVariants, products, customers, shopSettings } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq } from "drizzle-orm";
import { generateInvoicePdf, type InvoicePdfInput } from "@/lib/pdf/invoice-pdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const saleId = Number(id);

  if (!Number.isInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ error: "Invalid sale id" }, { status: 400 });
  }

  const [sale] = await db.select().from(sales).where(eq(sales.id, saleId));
  if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const [shop] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
  const customer = sale.customerId ? await db.select().from(customers).where(eq(customers.id, sale.customerId)).then((r) => r[0]) : undefined;

  const items = await db
    .select({
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      lineTotal: saleItems.lineTotal,
      returnedQty: saleItems.returnedQty,
      sku: productVariants.sku,
      size: productVariants.size,
      color: productVariants.color,
      productName: products.name,
    })
    .from(saleItems)
    .innerJoin(productVariants, eq(productVariants.id, saleItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(saleItems.saleId, sale.id));

  const input: InvoicePdfInput = {
    shopName: shop?.shopName ?? "Clothes & Tailor Shop",
    shopAddress: shop?.address ?? undefined,
    shopPhone: shop?.phone ?? undefined,
    shopEmail: shop?.email ?? undefined,

    documentTypeLabel: "Sales Receipt",
    documentNo: sale.saleNo,
    documentDate: sale.saleDate,
    status: sale.status,

    partyLabel: "Customer",
    partyName: customer?.name ?? "Walk-in Customer",
    partyPhone: customer?.phone ?? undefined,
    partyEmail: customer?.email ?? undefined,

    fields: [{ label: "Payment Method", value: sale.paymentMethod ?? "" }],
    lineItems: items.map((i) => ({
      label: `${i.productName} (${i.sku})`,
      detail: `${[i.size, i.color].filter(Boolean).join(" / ")} · Qty ${i.quantity}${i.returnedQty > 0 ? ` (${i.returnedQty} returned)` : ""}`,
      amount: Number(i.lineTotal),
    })),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    taxAmount: Number(sale.taxAmount),
    totalAmount: Number(sale.totalAmount),
    currencyCode: shop?.currency ?? undefined,
  };

  const pdfBytes = await generateInvoicePdf(input);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sale.saleNo}.pdf"`,
    },
  });
}
