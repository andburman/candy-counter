"use server";

import { revalidatePath } from "next/cache";
import {
  getAllCandies,
  getCandiesByYear,
  getAvailableYears,
  incrementCandy,
  getCandyById,
  deleteCandy as deleteCandyByName,
  deleteCandyById,
  setCandyCount,
  getCandyByName,
  getCurrentYear,
  type Candy,
} from "@/lib/candy";
import {
  getAllCatalogItems,
  getCatalogItemById,
  createCatalogItem,
  updateCatalogItem,
  deactivateCatalogItem,
  activateCatalogItem,
  mergeCatalogItems,
  type CandyCatalogItem,
} from "@/lib/catalog";
import { getDb } from "@/lib/db";

/**
 * Add candy (increments if exists, creates if new) - uses catalog_id
 */
export async function addCandy(catalogId: number, quantity: number): Promise<Candy> {
  if (!catalogId || catalogId < 1) {
    throw new Error("Valid catalog ID is required");
  }
  if (quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }
  
  const candy = incrementCandy(catalogId, quantity);
  revalidatePath("/");
  return candy;
}

/**
 * Get all candies, optionally filtered by year
 */
export async function getAllCandiesAction(year?: number): Promise<Candy[]> {
  return getAllCandies(year);
}

/**
 * Get all candies for a specific year
 */
export async function getCandiesByYearAction(year: number): Promise<Candy[]> {
  return getCandiesByYear(year);
}

/**
 * Get all available years that have candy data
 */
export async function getAvailableYearsAction(): Promise<number[]> {
  const years = getAvailableYears();
  const currentYear = getCurrentYear();
  // Ensure current year is always included even if no data exists yet
  if (!years.includes(currentYear)) {
    return [currentYear, ...years];
  }
  return years;
}

/**
 * Update candy by ID (updates catalog_id and/or count)
 */
export async function updateCandy(
  id: number,
  catalogId: number,
  count: number
): Promise<Candy> {
  if (!catalogId || catalogId < 1) {
    throw new Error("Valid catalog ID is required");
  }
  if (count < 0) {
    throw new Error("Count cannot be negative");
  }

  const existing = getCandyById(id);
  if (!existing) {
    throw new Error("Candy not found");
  }

  const db = getDb();

  // Check if catalog_id changed
  if (catalogId !== existing.catalog_id) {
    // Check if this catalog_id already exists for this year
    const existingForYear = db.prepare(`
      SELECT * FROM candy_counts 
      WHERE catalog_id = ? AND year = ? AND id != ?
    `).get(catalogId, existing.year, id);
    
    if (existingForYear) {
      throw new Error("This candy type already exists for this year");
    }
  }

  // Get catalog name for denormalization
  const catalogItem = db.prepare("SELECT name FROM candy_catalog WHERE id = ?").get(catalogId) as { name: string } | undefined;
  const candyName = catalogItem?.name || "";

  // Update both catalog_id and count
  const stmt = db.prepare(
    "UPDATE candy_counts SET catalog_id = ?, candy_name = ?, count = ? WHERE id = ?"
  );
  stmt.run(catalogId, candyName, count, id);

  const updated = getCandyById(id);
  if (!updated) {
    throw new Error("Failed to update candy");
  }

  revalidatePath("/");
  return updated;
}

/**
 * Delete candy by ID
 */
export async function deleteCandy(id: number): Promise<boolean> {
  const existing = getCandyById(id);
  if (!existing) {
    return false;
  }

  const result = deleteCandyById(id);
  revalidatePath("/");
  return result;
}

// ===== CATALOG MANAGEMENT ACTIONS =====

/**
 * Get all catalog items
 */
export async function getAllCatalogItemsAction(includeInactive: boolean = false): Promise<CandyCatalogItem[]> {
  return getAllCatalogItems(includeInactive);
}

/**
 * Create a new catalog item
 */
export async function createCatalogItemAction(name: string, description?: string): Promise<CandyCatalogItem> {
  if (!name || name.trim() === "") {
    throw new Error("Candy name is required");
  }
  
  const item = createCatalogItem(name.trim(), description?.trim());
  revalidatePath("/");
  return item;
}

/**
 * Update an existing catalog item
 */
export async function updateCatalogItemAction(
  id: number,
  name: string,
  description?: string
): Promise<CandyCatalogItem> {
  if (!name || name.trim() === "") {
    throw new Error("Candy name is required");
  }
  
  const item = updateCatalogItem(id, name.trim(), description?.trim());
  revalidatePath("/");
  return item;
}

/**
 * Deactivate a catalog item
 */
export async function deactivateCatalogItemAction(id: number): Promise<boolean> {
  const result = deactivateCatalogItem(id);
  revalidatePath("/");
  return result;
}

/**
 * Activate a catalog item
 */
export async function activateCatalogItemAction(id: number): Promise<boolean> {
  const result = activateCatalogItem(id);
  revalidatePath("/");
  return result;
}

/**
 * Merge two catalog items (source into target)
 */
export async function mergeCatalogItemsAction(sourceId: number, targetId: number): Promise<boolean> {
  const result = mergeCatalogItems(sourceId, targetId);
  revalidatePath("/");
  return result;
}

