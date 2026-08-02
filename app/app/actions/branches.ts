"use server";

import { z } from "zod";
import { db, branches } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const branchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type BranchFormState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

/**
 * Only owner/manager can create branches — enforced here rather than
 * just hidden in the UI, since server actions are reachable directly.
 */
export async function createBranch(_prevState: BranchFormState, formData: FormData): Promise<BranchFormState> {
  const parsed = branchSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();
  if (session.roleName !== "owner" && session.roleName !== "manager") {
    return { status: "error", message: "Only an owner or manager can add branches." };
  }

  try {
    await db.insert(branches).values({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
    });
    revalidatePath("/branches");
    return { status: "success", message: `Branch "${parsed.data.name}" added.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to add branch." };
  }
}
