import { NextResponse } from "next/server";
import { db, measurementProfiles } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const customerId = Number(body.customerId);
    const garmentType = typeof body.garmentType === "string" ? body.garmentType : "";
    if (!Number.isInteger(customerId) || customerId <= 0 || !garmentType) {
      return NextResponse.json({ error: "Customer and garment type are required." }, { status: 400 });
    }

    const [profile] = await db.insert(measurementProfiles).values({
      customerId,
      garmentType,
      label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : null,
      measurements: body.measurements && typeof body.measurements === "object" ? body.measurements : {},
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      takenBy: session.userId,
      takenAt: new Date().toISOString().slice(0, 10),
    }).returning({ id: measurementProfiles.id, label: measurementProfiles.label, garmentType: measurementProfiles.garmentType });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create measurement profile." }, { status: 500 });
  }
}
