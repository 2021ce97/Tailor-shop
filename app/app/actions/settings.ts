"use server";

import { z } from "zod";
import { db, shopSettings } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const settingsSchema = z.object({
  shopName: z.string().min(1, "Shop name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  currency: z.string().min(1).default("PKR"),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export type SettingsFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

export async function updateShopSettings(_prevState: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await requireSession();

  try {
    await db
      .update(shopSettings)
      .set({
        shopName: parsed.data.shopName,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        currency: parsed.data.currency,
        taxPercent: String(parsed.data.taxPercent),
        logoUrl: parsed.data.logoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(shopSettings.id, 1));

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { status: "success", message: "Shop settings updated." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to update settings." };
  }
}
