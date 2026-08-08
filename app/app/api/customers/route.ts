import { NextResponse } from "next/server";
import { db, customers } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!name || !phone) return NextResponse.json({ error: "Customer name and phone are required." }, { status: 400 });

    const [existing] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
    if (existing) return NextResponse.json(existing);

    const [customer] = await db.insert(customers).values({ name, phone }).returning();
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create customer." }, { status: 500 });
  }
}
