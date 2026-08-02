"use server";

import { z } from "zod";
import { db, appointments } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const appointmentSchema = z.object({
  customerId: z.coerce.number().int().positive("Select a customer"),
  appointmentType: z.enum(["measurement", "fitting", "consultation"]),
  scheduledAt: z.string().min(1, "Date/time is required"),
  durationMinutes: z.coerce.number().int().min(5).default(30),
  notes: z.string().optional(),
});

export type AppointmentFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

export async function createAppointment(_prevState: AppointmentFormState, formData: FormData): Promise<AppointmentFormState> {
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();

  try {
    await db.insert(appointments).values({
      customerId: parsed.data.customerId,
      branchId: session.branchId,
      appointmentType: parsed.data.appointmentType,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMinutes: parsed.data.durationMinutes,
      notes: parsed.data.notes || null,
    });
    revalidatePath("/appointments");
    return { status: "success", message: "Appointment scheduled." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to schedule appointment." };
  }
}
