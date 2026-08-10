"use server";

import { db, businessContacts, users, branches } from "@/lib/db";
import { eq, and, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/get-session";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Get all business contacts for a branch with optional search
 */
export async function getBusinessContacts(branchId: number, search?: string) {
  try {
    let query = db.select().from(businessContacts).where(eq(businessContacts.branchId, branchId));

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = db
        .select()
        .from(businessContacts)
        .where(
          and(
            eq(businessContacts.branchId, branchId),
            // Search in name, phone, or contact code
            like(businessContacts.name, searchTerm)
          )
        );
    }

    const contacts = await query;
    return contacts;
  } catch (error) {
    console.error("Failed to get business contacts:", error);
    throw error;
  }
}

/**
 * Create a new business contact
 */
export async function createBusinessContact(
  state: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  try {
    const session = await requireSession();
    const name = formData.get("name")?.toString().trim();
    const phone = formData.get("phone")?.toString().trim();
    const roles = JSON.parse(formData.get("roles")?.toString() || "[]");
    const notes = formData.get("notes")?.toString().trim() || null;

    if (!name) {
      return { status: "error", message: "Name is required" };
    }

    const contactCode = `CNT-${Date.now().toString().slice(-8)}`;

    await db.insert(businessContacts).values({
      branchId: session.branchId,
      contactCode,
      name,
      phone: phone || null,
      roles,
      status: "active",
      notes,
    });

    revalidatePath("/accounts");
    return { status: "success", message: "Contact created successfully" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

/**
 * Update a business contact
 */
export async function updateBusinessContact(
  state: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  try {
    const id = Number(formData.get("id"));
    const name = formData.get("name")?.toString().trim();
    const phone = formData.get("phone")?.toString().trim();
    const roles = JSON.parse(formData.get("roles")?.toString() || "[]");
    const status = (formData.get("status")?.toString() || "active") as "active" | "inactive";
    const notes = formData.get("notes")?.toString().trim() || null;

    if (!name) {
      return { status: "error", message: "Name is required" };
    }

    await db.update(businessContacts).set({ name, phone: phone || null, roles, status, notes }).where(eq(businessContacts.id, id));

    revalidatePath("/accounts");
    return { status: "success", message: "Contact updated successfully" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to update contact",
    };
  }
}

/**
 * Add a role to a contact
 */
export async function addRoleToContact(
  contactId: number,
  role: string
): Promise<ContactFormState> {
  try {
    const [contact] = await db.select().from(businessContacts).where(eq(businessContacts.id, contactId));

    if (!contact) {
      return { status: "error", message: "Contact not found" };
    }

    const roles = Array.isArray(contact.roles) ? contact.roles : [];
    if (!roles.includes(role)) {
      roles.push(role);
      await db.update(businessContacts).set({ roles }).where(eq(businessContacts.id, contactId));
      revalidatePath("/accounts");
    }

    return { status: "success", message: `Role '${role}' added` };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to add role",
    };
  }
}

/**
 * Remove a role from a contact
 */
export async function removeRoleFromContact(
  contactId: number,
  role: string
): Promise<ContactFormState> {
  try {
    const [contact] = await db.select().from(businessContacts).where(eq(businessContacts.id, contactId));

    if (!contact) {
      return { status: "error", message: "Contact not found" };
    }

    const roles = Array.isArray(contact.roles) ? contact.roles : [];
    const updatedRoles = roles.filter((r) => r !== role);

    await db.update(businessContacts).set({ roles: updatedRoles }).where(eq(businessContacts.id, contactId));

    revalidatePath("/accounts");
    return { status: "success", message: `Role '${role}' removed` };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to remove role",
    };
  }
}

/**
 * Deactivate a business contact
 */
export async function deactivateBusinessContact(id: number): Promise<ContactFormState> {
  try {
    await db.update(businessContacts).set({ status: "inactive" }).where(eq(businessContacts.id, id));

    revalidatePath("/accounts");
    return { status: "success", message: "Contact deactivated" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to deactivate contact",
    };
  }
}

/**
 * Create a system user account for a contact (enables login)
 * TODO: Implement with proper password hashing (bcrypt) and role selection
 */
export async function createUserForContact(
  state: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  return {
    status: "error",
    message: "User account creation requires proper password hashing implementation. Coming soon.",
  };
}
