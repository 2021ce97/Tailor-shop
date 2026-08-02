"use server";

import { z } from "zod";
import { db, measurementProfiles } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const measurementSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  garmentType: z.enum(["shirt", "pant", "suit", "kurta", "dress", "coat", "other"]),
  label: z.string().optional(),
  measurementsJson: z.string().default("{}"),
  notes: z.string().optional(),
});

export type MeasurementFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createMeasurementProfile(
  _prevState: MeasurementFormState,
  formData: FormData
): Promise<MeasurementFormState> {
  const parsed = measurementSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let measurements: Record<string, unknown>;
  try {
    measurements = JSON.parse(parsed.data.measurementsJson || "{}");
  } catch {
    return { status: "error", message: "Invalid measurement values." };
  }

  const session = await requireSession();

  try {
    await db.insert(measurementProfiles).values({
      customerId: parsed.data.customerId,
      garmentType: parsed.data.garmentType,
      label: parsed.data.label || null,
      measurements,
      notes: parsed.data.notes || null,
      takenBy: session.userId,
      takenAt: new Date().toISOString().slice(0, 10),
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { status: "success", message: "Measurement profile saved." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to save measurements." };
  }
}
