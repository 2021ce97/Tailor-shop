"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, roles, users } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const staffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  dailyWage: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().min(0).optional()),
  isTailorStaff: z.string().optional(),
});

export type StaffFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createStaffMember(_prevState: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const parsed = staffSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted staff details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();
  if (session.roleName !== "owner" && session.roleName !== "manager") {
    return { status: "error", message: "Only an owner or manager can add staff." };
  }

  const [tailorRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, "tailor"));
  if (!tailorRole) return { status: "error", message: "The Tailor role is missing. Run the initial setup seed." };

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await db.insert(users).values({
      roleId: tailorRole.id,
      branchId: session.branchId,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      phone: parsed.data.phone || null,
      dailyWage: parsed.data.dailyWage === undefined ? null : String(parsed.data.dailyWage),
      isTailorStaff: parsed.data.isTailorStaff === "on",
      status: "active",
    });

    revalidatePath("/staff");
    revalidatePath("/tailor-orders/new");
    return { status: "success", message: `${parsed.data.name} added to this branch.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to add staff." };
  }
}
