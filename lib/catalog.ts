import { getDb } from "./db";

export interface CandyCatalogItem {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all catalog items, optionally filtering by active status
 */
export function getAllCatalogItems(includeInactive: boolean = false): CandyCatalogItem[] {
  const db = getDb();
  
  if (includeInactive) {
    const stmt = db.prepare("SELECT * FROM candy_catalog ORDER BY name");
    return stmt.all() as CandyCatalogItem[];
  } else {
    const stmt = db.prepare("SELECT * FROM candy_catalog WHERE is_active = 1 ORDER BY name");
    return stmt.all() as CandyCatalogItem[];
  }
}

/**
 * Get a specific catalog item by ID
 */
export function getCatalogItemById(id: number): CandyCatalogItem | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM candy_catalog WHERE id = ?");
  const item = stmt.get(id) as CandyCatalogItem | undefined;
  return item || null;
}

/**
 * Get a specific catalog item by name
 */
export function getCatalogItemByName(name: string): CandyCatalogItem | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM candy_catalog WHERE name = ?");
  const item = stmt.get(name) as CandyCatalogItem | undefined;
  return item || null;
}

/**
 * Create a new catalog item
 */
export function createCatalogItem(name: string, description?: string): CandyCatalogItem {
  const db = getDb();
  
  // Check if item with this name already exists
  const existing = getCatalogItemByName(name);
  if (existing) {
    throw new Error(`Candy catalog item with name "${name}" already exists`);
  }
  
  const stmt = db.prepare(`
    INSERT INTO candy_catalog (name, description, is_active) 
    VALUES (?, ?, 1)
  `);
  stmt.run(name.trim(), description?.trim() || null);
  
  const created = getCatalogItemByName(name);
  if (!created) {
    throw new Error("Failed to create catalog item");
  }
  
  return created;
}

/**
 * Update an existing catalog item
 */
export function updateCatalogItem(
  id: number,
  name: string,
  description?: string
): CandyCatalogItem {
  const db = getDb();
  
  const existing = getCatalogItemById(id);
  if (!existing) {
    throw new Error("Catalog item not found");
  }
  
  // If name changed, check if new name already exists
  if (name.trim() !== existing.name) {
    const nameExists = getCatalogItemByName(name.trim());
    if (nameExists && nameExists.id !== id) {
      throw new Error(`Candy catalog item with name "${name}" already exists`);
    }
  }
  
  const stmt = db.prepare(`
    UPDATE candy_catalog 
    SET name = ?, description = ? 
    WHERE id = ?
  `);
  stmt.run(name.trim(), description?.trim() || null, id);
  
  const updated = getCatalogItemById(id);
  if (!updated) {
    throw new Error("Failed to update catalog item");
  }
  
  return updated;
}

/**
 * Deactivate a catalog item (soft delete)
 */
export function deactivateCatalogItem(id: number): boolean {
  const db = getDb();
  
  const existing = getCatalogItemById(id);
  if (!existing) {
    return false;
  }
  
  const stmt = db.prepare("UPDATE candy_catalog SET is_active = 0 WHERE id = ?");
  const result = stmt.run(id);
  
  return result.changes > 0;
}

/**
 * Reactivate a catalog item
 */
export function activateCatalogItem(id: number): boolean {
  const db = getDb();
  
  const existing = getCatalogItemById(id);
  if (!existing) {
    return false;
  }
  
  const stmt = db.prepare("UPDATE candy_catalog SET is_active = 1 WHERE id = ?");
  const result = stmt.run(id);
  
  return result.changes > 0;
}

/**
 * Merge two catalog items - moves all candy_counts from source to target and deactivates source
 */
export function mergeCatalogItems(sourceId: number, targetId: number): boolean {
  const db = getDb();
  
  const source = getCatalogItemById(sourceId);
  const target = getCatalogItemById(targetId);
  
  if (!source || !target) {
    throw new Error("Source or target catalog item not found");
  }
  
  if (sourceId === targetId) {
    throw new Error("Cannot merge catalog item with itself");
  }
  
  // Use a transaction to ensure atomicity
  const transaction = db.transaction(() => {
    // First, get all records that need to be merged
    const sourceRecords = db.prepare(`
      SELECT * FROM candy_counts WHERE catalog_id = ?
    `).all(sourceId) as Array<{ id: number; year: number; count: number }>;
    
    for (const record of sourceRecords) {
      // Check if target already has a record for this year
      const existingTarget = db.prepare(`
        SELECT * FROM candy_counts 
        WHERE catalog_id = ? AND year = ?
      `).get(targetId, record.year) as { id: number; count: number } | undefined;
      
      if (existingTarget) {
        // Merge counts: add source count to target
        const mergeStmt = db.prepare(`
          UPDATE candy_counts 
          SET count = count + ? 
          WHERE id = ?
        `);
        mergeStmt.run(record.count, existingTarget.id);
        
        // Delete the source record since it's been merged
        const deleteStmt = db.prepare("DELETE FROM candy_counts WHERE id = ?");
        deleteStmt.run(record.id);
      } else {
        // No conflict, just update the catalog_id
        const updateStmt = db.prepare(`
          UPDATE candy_counts 
          SET catalog_id = ? 
          WHERE id = ?
        `);
        updateStmt.run(targetId, record.id);
      }
    }
    
    // Deactivate source catalog item
    db.prepare("UPDATE candy_catalog SET is_active = 0 WHERE id = ?").run(sourceId);
  });
  
  try {
    transaction();
    return true;
  } catch (e) {
    console.error("Error merging catalog items:", e);
    throw new Error("Failed to merge catalog items");
  }
}

