"use server";

import { db, storageLocations, garmentStorageAssignments, tailorOrderItems } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/get-session";

export interface CabinetActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Get all storage locations with current occupancy counts for a branch
 */
export async function getStorageLocationsWithOccupancy(branchId: number) {
  try {
    const locations = await db
      .select()
      .from(storageLocations)
      .where(and(eq(storageLocations.branchId, branchId), eq(storageLocations.isActive, true)));

    // Get occupancy for each location
    const locationsWithOccupancy = await Promise.all(
      locations.map(async (location) => {
        const occupiedGarments = await db
          .select({ garmentItemId: garmentStorageAssignments.garmentItemId, tailorOrderId: tailorOrderItems.tailorOrderId })
          .from(garmentStorageAssignments)
          .innerJoin(tailorOrderItems, eq(tailorOrderItems.id, garmentStorageAssignments.garmentItemId))
          .where(and(eq(garmentStorageAssignments.storageLocationId, location.id), isNull(garmentStorageAssignments.removedAt)));
        const occupiedOrders = new Set(occupiedGarments.map((assignment) => assignment.tailorOrderId)).size;

        return {
          ...location,
          occupiedGarments: occupiedGarments.length,
          occupiedOrders,
          garmentsAvailable: Math.max(
            0,
            (location.capacityGarments || 20) - occupiedGarments.length
          ),
          ordersAvailable: Math.max(0, (location.capacityOrders || 10) - occupiedOrders),
        };
      })
    );

    return locationsWithOccupancy;
  } catch (error) {
    console.error("Failed to get storage locations:", error);
    throw error;
  }
}

/**
 * Get garments currently stored in a specific location
 */
export async function getStoredGarments(locationId: number) {
  try {
    const assignments = await db
      .select({
        assignmentId: garmentStorageAssignments.id,
        garmentItemId: garmentStorageAssignments.garmentItemId,
        storedAt: garmentStorageAssignments.storedAt,
        storedBy: garmentStorageAssignments.storedBy,
        ticketNo: tailorOrderItems.ticketNo,
        garmentType: tailorOrderItems.garmentTypeSnapshot,
      })
      .from(garmentStorageAssignments)
      .innerJoin(
        tailorOrderItems,
        eq(garmentStorageAssignments.garmentItemId, tailorOrderItems.id)
      )
      .where(
        and(
          eq(garmentStorageAssignments.storageLocationId, locationId),
          isNull(garmentStorageAssignments.removedAt)
        )
      );

    return assignments;
  } catch (error) {
    console.error("Failed to get stored garments:", error);
    throw error;
  }
}

/**
 * Assign a garment to a storage location
 */
export async function assignGarmentToLocation(
  garmentItemId: number,
  locationId: number
): Promise<CabinetActionState> {
  try {
    const session = await requireSession();

    // Check if garment is already stored
    const existingAssignment = await db
      .select()
      .from(garmentStorageAssignments)
      .where(
        and(
          eq(garmentStorageAssignments.garmentItemId, garmentItemId),
          isNull(garmentStorageAssignments.removedAt)
        )
      );

    if (existingAssignment.length > 0) {
      return { status: "error", message: "Garment is already in storage" };
    }

    // Get location and garment details
    const [location] = await db
      .select()
      .from(storageLocations)
      .where(eq(storageLocations.id, locationId));

    if (!location || !location.isActive) {
      return { status: "error", message: "Storage location not found or inactive" };
    }

    // Check capacity
    const occupied = await db
      .select()
      .from(garmentStorageAssignments)
      .where(
        and(
          eq(garmentStorageAssignments.storageLocationId, locationId),
          isNull(garmentStorageAssignments.removedAt)
        )
      );

    if (occupied.length >= (location.capacityGarments || 20)) {
      return {
        status: "error",
        message: `Storage location ${location.code} is at capacity (${location.capacityGarments || 20} garments)`,
      };
    }

    // Create assignment
    await db.insert(garmentStorageAssignments).values({
      garmentItemId,
      storageLocationId: locationId,
      storedBy: session.userId,
      storedAt: new Date(),
    });

    revalidatePath("/cabinet");
    return { status: "success", message: `Garment stored in ${location.code}` };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to assign garment",
    };
  }
}

/**
 * Remove a garment from storage
 */
export async function removeGarmentFromStorage(
  garmentItemId: number
): Promise<CabinetActionState> {
  try {
    const [assignment] = await db
      .select()
      .from(garmentStorageAssignments)
      .where(
        and(
          eq(garmentStorageAssignments.garmentItemId, garmentItemId),
          isNull(garmentStorageAssignments.removedAt)
        )
      );

    if (!assignment) {
      return { status: "error", message: "Garment is not in storage" };
    }

    // Mark as removed
    await db
      .update(garmentStorageAssignments)
      .set({ removedAt: new Date() })
      .where(eq(garmentStorageAssignments.id, assignment.id));

    revalidatePath("/cabinet");
    return { status: "success", message: "Garment removed from storage" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to remove garment",
    };
  }
}

/**
 * Move a garment between storage locations
 */
export async function moveGarmentToLocation(
  garmentItemId: number,
  newLocationId: number
): Promise<CabinetActionState> {
  try {
    // Remove from current location
    const removeResult = await removeGarmentFromStorage(garmentItemId);
    if (removeResult.status === "error") {
      return removeResult;
    }

    // Assign to new location
    const assignResult = await assignGarmentToLocation(garmentItemId, newLocationId);
    if (assignResult.status === "error") {
      return assignResult;
    }

    revalidatePath("/cabinet");
    return { status: "success", message: "Garment moved to new location" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to move garment",
    };
  }
}
