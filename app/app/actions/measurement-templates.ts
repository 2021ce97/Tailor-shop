"use server";

import { db, measurementTemplates } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

export async function createMeasurementTemplate(formData: FormData) {
  const session = await requireSession();
  if (session.roleName !== "owner") throw new Error("Only the owner can save measurement templates.");
  const garmentType = String(formData.get("garmentType") || "other").trim();
  const name = String(formData.get("name") || "").trim();
  const fields = String(formData.get("fieldsJson") || "[]");
  if (!name) throw new Error("Template name is required.");
  const parsed = JSON.parse(fields);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Add at least one measurement category.");
  await db.insert(measurementTemplates).values({ garmentType, name, fields: parsed });
  revalidatePath("/customers");
}
