"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { createTailorOrder } from "@/lib/accounting/create-tailor-order";
import { db, customers, garmentTypes, tailorOrderItems } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";

const itemSchema = z.object({ garmentTypeId: z.number().int().positive(), measurements: z.record(z.string(), z.string()).default({}), designs: z.record(z.string(), z.string()).default({}), amount: z.number().min(0), notes: z.string().optional() });
const orderSchema = z.object({ customerId: z.number().int().positive().optional(), newCustomerName: z.string().trim().optional(), newCustomerPhone: z.string().trim().optional(), orderDate: z.string().min(1), promisedDate: z.string().optional(), advancePaid: z.number().min(0).default(0), paymentMethod: z.enum(["cash", "bank"]).default("cash"), fabricId: z.number().int().positive().optional(), fabricQtyUsed: z.number().positive().optional(), notes: z.string().optional(), items: z.array(itemSchema).min(1) });

export type GarmentOrderState = { status: "idle" | "success" | "error"; message?: string };

export async function createGarmentOrder(_state: GarmentOrderState, formData: FormData): Promise<GarmentOrderState> {
  try {
    const rawItems = JSON.parse(String(formData.get("itemsJson") ?? "[]"));
    const parsed = orderSchema.parse({ customerId: formData.get("customerId") ? Number(formData.get("customerId")) : undefined, newCustomerName: formData.get("newCustomerName"), newCustomerPhone: formData.get("newCustomerPhone"), orderDate: formData.get("orderDate"), promisedDate: formData.get("promisedDate") || undefined, advancePaid: Number(formData.get("advancePaid") || 0), paymentMethod: formData.get("paymentMethod") || "cash", fabricId: formData.get("fabricId") ? Number(formData.get("fabricId")) : undefined, fabricQtyUsed: formData.get("fabricQtyUsed") ? Number(formData.get("fabricQtyUsed")) : undefined, notes: formData.get("notes") || undefined, items: rawItems });
    if (parsed.fabricId && !parsed.fabricQtyUsed) throw new Error("Enter the amount of shop fabric used.");
    if (!parsed.fabricId && parsed.fabricQtyUsed) throw new Error("Choose a fabric from inventory before entering a quantity.");
    const session = await requireSession();
    let customerId = parsed.customerId;
    if (!customerId) {
      if (!parsed.newCustomerName || !parsed.newCustomerPhone) throw new Error("Choose an existing customer or enter the new customer name and phone number.");
      const [customer] = await db.insert(customers).values({ customerCode: `CUS-${Date.now().toString().slice(-8)}`, name: parsed.newCustomerName, phone: parsed.newCustomerPhone }).returning({ id: customers.id });
      customerId = customer.id;
    }
    const types = await db.select().from(garmentTypes);
    const selectedTypes = parsed.items.map((item) => types.find((type) => type.id === item.garmentTypeId));
    if (selectedTypes.some((type) => !type || !type.isActive)) throw new Error("One or more selected garment types are unavailable.");
    const total = parsed.items.reduce((sum, item) => sum + item.amount, 0);
    if (parsed.advancePaid > total) throw new Error("Advance payment cannot exceed the order total.");
    const nextOrder = await db.execute<{ next_no: number }>(sql`SELECT COALESCE(MAX(CASE WHEN order_no ~ '^[0-9]+$' THEN order_no::INTEGER ELSE 0 END), 0) + 1 AS next_no FROM tailor_orders`);
    const orderNo = String(Number(nextOrder[0]?.next_no ?? 1)).padStart(3, "0");
    const firstType = selectedTypes[0]!;
    const order = await createTailorOrder({ orderNo, orderKind: "custom", customerId, branchId: session.branchId, garmentType: firstType.code, fabricId: parsed.fabricId, fabricSource: parsed.fabricId ? "shop" : "customer_provided", fabricQtyUsed: parsed.fabricQtyUsed, orderDate: parsed.orderDate, promisedDate: parsed.promisedDate, stitchingCharge: total, fabricCharge: 0, otherCharges: 0, discount: 0, advancePaid: parsed.advancePaid, advancePaymentMethod: parsed.paymentMethod, notes: parsed.notes, createdBy: session.userId });
    await db.insert(tailorOrderItems).values(parsed.items.map((item, index) => {
      const type = selectedTypes[index]!;
      return { tailorOrderId: order.id, garmentTypeId: type.id, ticketNo: `${orderNo}-${index + 1}`, garmentTypeSnapshot: { code: type.code, nameFa: type.nameFa, namePs: type.namePs }, measurementSnapshot: item.measurements, designSnapshot: item.designs, itemAmount: String(item.amount), notes: item.notes || null };
    }));
    revalidatePath("/tailor-orders"); revalidatePath("/dashboard"); revalidatePath("/fabrics");
    return { status: "success", message: `Order ${orderNo} was created.` };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not create the order." }; }
}
