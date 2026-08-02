"use server";

import { z } from "zod";
import { db, customers } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export type CustomerFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createCustomer(_prevState: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await requireSession();

  try {
    await db.insert(customers).values({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    });

    revalidatePath("/customers");
    return { status: "success", message: `Customer "${parsed.data.name}" added.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to add customer." };
  }
}
