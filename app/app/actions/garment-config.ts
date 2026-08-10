"use server";

import { db, garmentTypes, garmentMeasurementFields, garmentDesignCategories, garmentDesignOptions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface GarmentTypeFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export async function createGarmentType(
  formData: FormData
): Promise<GarmentTypeFormState> {
  try {
    const code = formData.get("code")?.toString().trim();
    const nameFa = formData.get("nameFa")?.toString().trim();
    const namePs = formData.get("namePs")?.toString().trim();

    if (!code || !nameFa || !namePs) {
      return { status: "error", message: "All fields are required" };
    }

    await db.insert(garmentTypes).values({
      code,
      nameFa,
      namePs,
      isActive: true,
    });

    revalidatePath("/garment-config");
    return { status: "success", message: "Garment type created" };
  } catch (err: any) {
    if (err.message?.includes("unique constraint")) {
      return { status: "error", message: "Code already exists" };
    }
    return { status: "error", message: "Failed to create garment type" };
  }
}

export async function updateGarmentType(
  id: number,
  formData: FormData
): Promise<GarmentTypeFormState> {
  try {
    const nameFa = formData.get("nameFa")?.toString().trim();
    const namePs = formData.get("namePs")?.toString().trim();
    const isActive = formData.get("isActive") === "on";

    if (!nameFa || !namePs) {
      return { status: "error", message: "All fields are required" };
    }

    await db
      .update(garmentTypes)
      .set({ nameFa, namePs, isActive })
      .where(eq(garmentTypes.id, id));

    revalidatePath("/garment-config");
    return { status: "success", message: "Garment type updated" };
  } catch {
    return { status: "error", message: "Failed to update garment type" };
  }
}

export async function addMeasurementField(
  garmentTypeId: number,
  formData: FormData
): Promise<GarmentTypeFormState> {
  try {
    const code = formData.get("code")?.toString().trim();
    const labelFa = formData.get("labelFa")?.toString().trim();
    const labelPs = formData.get("labelPs")?.toString().trim();
    const unit = formData.get("unit")?.toString().trim() || "inch";
    const isRequired = formData.get("isRequired") === "on";

    if (!code || !labelFa || !labelPs) {
      return { status: "error", message: "All fields are required" };
    }

    await db.insert(garmentMeasurementFields).values({
      garmentTypeId,
      code,
      labelFa,
      labelPs,
      unit,
      isRequired,
    });

    revalidatePath("/garment-config");
    return { status: "success", message: "Measurement field added" };
  } catch {
    return { status: "error", message: "Failed to add measurement field" };
  }
}

export async function deleteMeasurementField(
  id: number
): Promise<GarmentTypeFormState> {
  try {
    await db.delete(garmentMeasurementFields).where(eq(garmentMeasurementFields.id, id));
    revalidatePath("/garment-config");
    return { status: "success", message: "Field deleted" };
  } catch {
    return { status: "error", message: "Failed to delete field" };
  }
}

export async function addDesignCategory(
  garmentTypeId: number,
  formData: FormData
): Promise<GarmentTypeFormState> {
  try {
    const code = formData.get("code")?.toString().trim();
    const labelFa = formData.get("labelFa")?.toString().trim();
    const labelPs = formData.get("labelPs")?.toString().trim();
    const isRequired = formData.get("isRequired") === "on";

    if (!code || !labelFa || !labelPs) {
      return { status: "error", message: "All fields are required" };
    }

    await db.insert(garmentDesignCategories).values({
      garmentTypeId,
      code,
      labelFa,
      labelPs,
      isRequired,
    });

    revalidatePath("/garment-config");
    return { status: "success", message: "Design category added" };
  } catch {
    return { status: "error", message: "Failed to add design category" };
  }
}

export async function deleteDesignCategory(
  id: number
): Promise<GarmentTypeFormState> {
  try {
    await db.delete(garmentDesignCategories).where(eq(garmentDesignCategories.id, id));
    revalidatePath("/garment-config");
    return { status: "success", message: "Category deleted" };
  } catch {
    return { status: "error", message: "Failed to delete category" };
  }
}

export async function addDesignOption(
  categoryId: number,
  formData: FormData
): Promise<GarmentTypeFormState> {
  try {
    const labelFa = formData.get("labelFa")?.toString().trim();
    const labelPs = formData.get("labelPs")?.toString().trim();

    if (!labelFa || !labelPs) {
      return { status: "error", message: "Both labels are required" };
    }

    await db.insert(garmentDesignOptions).values({
      categoryId,
      labelFa,
      labelPs,
    });

    revalidatePath("/garment-config");
    return { status: "success", message: "Design option added" };
  } catch {
    return { status: "error", message: "Failed to add design option" };
  }
}

export async function deleteDesignOption(
  id: number
): Promise<GarmentTypeFormState> {
  try {
    await db.delete(garmentDesignOptions).where(eq(garmentDesignOptions.id, id));
    revalidatePath("/garment-config");
    return { status: "success", message: "Option deleted" };
  } catch {
    return { status: "error", message: "Failed to delete option" };
  }
}
