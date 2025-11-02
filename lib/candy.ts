import { getDb } from "./db";

export interface Candy {
  id: number;
  catalog_id: number;
  candy_name: string; // Denormalized or from JOIN for display
  count: number;
  year: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get all candy counts, optionally filtered by year
 */
export function getAllCandies(year?: number): Candy[] {
  const db = getDb();
  if (year !== undefined) {
    const stmt = db.prepare(`
      SELECT 
        cc.id,
        cc.catalog_id,
        COALESCE(cat.name, cc.candy_name) as candy_name,
        cc.count,
        cc.year,
        cc.created_at,
        cc.updated_at
      FROM candy_counts cc
      LEFT JOIN candy_catalog cat ON cc.catalog_id = cat.id
      WHERE cc.year = ?
      ORDER BY candy_name
    `);
    return stmt.all(year) as Candy[];
  }
  const stmt = db.prepare(`
    SELECT 
      cc.id,
      cc.catalog_id,
      COALESCE(cat.name, cc.candy_name) as candy_name,
      cc.count,
      cc.year,
      cc.created_at,
      cc.updated_at
    FROM candy_counts cc
    LEFT JOIN candy_catalog cat ON cc.catalog_id = cat.id
    ORDER BY cc.year DESC, candy_name
  `);
  return stmt.all() as Candy[];
}

/**
 * Get all candies for a specific year
 */
export function getCandiesByYear(year: number): Candy[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
      cc.id,
      cc.catalog_id,
      COALESCE(cat.name, cc.candy_name) as candy_name,
      cc.count,
      cc.year,
      cc.created_at,
      cc.updated_at
    FROM candy_counts cc
    LEFT JOIN candy_catalog cat ON cc.catalog_id = cat.id
    WHERE cc.year = ?
    ORDER BY candy_name
  `);
  return stmt.all(year) as Candy[];
}

/**
 * Get all available years that have candy data
 */
export function getAvailableYears(): number[] {
  const db = getDb();
  const stmt = db.prepare("SELECT DISTINCT year FROM candy_counts ORDER BY year DESC");
  const results = stmt.all() as Array<{ year: number }>;
  return results.map((r) => r.year);
}

/**
 * Get a specific candy by name and year (deprecated - kept for backwards compatibility)
 * @deprecated Use getCandyByCatalogId or getCandyById instead
 */
export function getCandyByName(candyName: string, year?: number): Candy | null {
  const db = getDb();
  const targetYear = year ?? getCurrentYear();
  const stmt = db.prepare(`
    SELECT 
      cc.id,
      cc.catalog_id,
      COALESCE(cat.name, cc.candy_name) as candy_name,
      cc.count,
      cc.year,
      cc.created_at,
      cc.updated_at
    FROM candy_counts cc
    LEFT JOIN candy_catalog cat ON cc.catalog_id = cat.id
    WHERE (cat.name = ? OR cc.candy_name = ?) AND cc.year = ?
  `);
  const candy = stmt.get(candyName, candyName, targetYear) as Candy | undefined;
  return candy || null;
}

/**
 * Get a specific candy by catalog_id and year
 */
export function getCandyByCatalogId(catalogId: number, year?: number): Candy | null {
  const db = getDb();
  const targetYear = year ?? getCurrentYear();
  const stmt = db.prepare(`
    SELECT 
      cc.id,
      cc.catalog_id,
      COALESCE(cat.name, cc.candy_name) as candy_name,
      cc.count,
      cc.year,
      cc.created_at,
      cc.updated_at
    FROM candy_counts cc
    LEFT JOIN candy_catalog cat ON cc.catalog_id = cat.id
    WHERE cc.catalog_id = ? AND cc.year = ?
  `);
  const candy = stmt.get(catalogId, targetYear) as Candy | undefined;
  return candy || null;
}

/**
 * Get a specific candy by ID
 */
export function getCandyById(id: number): Candy | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
      cc.id,
      cc.catalog_id,
      COALESCE(cat.name, cc.candy_name) as candy_name,
      cc.count,
      cc.year,
      cc.created_at,
      cc.updated_at
    FROM candy_counts cc
    LEFT JOIN candy_catalog cat ON cc.catalog_id = cat.id
    WHERE cc.id = ?
  `);
  const candy = stmt.get(id) as Candy | undefined;
  return candy || null;
}

/**
 * Increment candy count (creates if doesn't exist) - uses catalog_id
 */
export function incrementCandy(catalogId: number, amount: number = 1, year?: number): Candy {
  const db = getDb();
  const targetYear = year ?? getCurrentYear();
  
  // Try to get existing candy
  const existing = db.prepare(`
    SELECT * FROM candy_counts 
    WHERE catalog_id = ? AND year = ?
  `).get(catalogId, targetYear) as Candy | undefined;
  
  if (existing) {
    // Update existing
    const stmt = db.prepare(
      "UPDATE candy_counts SET count = count + ? WHERE catalog_id = ? AND year = ?"
    );
    stmt.run(amount, catalogId, targetYear);
    // Fetch the updated record
    return getCandyById(existing.id)!;
  } else {
    // Get catalog name for denormalization
    const catalogItem = db.prepare("SELECT name FROM candy_catalog WHERE id = ?").get(catalogId) as { name: string } | undefined;
    const candyName = catalogItem?.name || "";
    
    // Create new
    const stmt = db.prepare(
      "INSERT INTO candy_counts (catalog_id, candy_name, count, year) VALUES (?, ?, ?, ?)"
    );
    stmt.run(catalogId, candyName, amount, targetYear);
    // Fetch the newly created record
    const newId = db.prepare("SELECT last_insert_rowid()").get() as { "last_insert_rowid()": number };
    return getCandyById(newId["last_insert_rowid()"])!;
  }
}

/**
 * Decrement candy count (uses catalog_id)
 */
export function decrementCandy(catalogId: number, amount: number = 1, year?: number): Candy | null {
  const db = getDb();
  const targetYear = year ?? getCurrentYear();
  const existing = getCandyByCatalogId(catalogId, targetYear);
  
  if (!existing) {
    return null;
  }
  
  const newCount = Math.max(0, existing.count - amount);
  const stmt = db.prepare(
    "UPDATE candy_counts SET count = ? WHERE catalog_id = ? AND year = ?"
  );
  stmt.run(newCount, catalogId, targetYear);
  // Fetch the updated record
  return getCandyByCatalogId(catalogId, targetYear)!;
}

/**
 * Set candy count to a specific value (uses catalog_id)
 */
export function setCandyCount(catalogId: number, count: number, year?: number): Candy {
  const db = getDb();
  const targetYear = year ?? getCurrentYear();
  const existing = getCandyByCatalogId(catalogId, targetYear);
  
  if (existing) {
    const stmt = db.prepare(
      "UPDATE candy_counts SET count = ? WHERE catalog_id = ? AND year = ?"
    );
    stmt.run(count, catalogId, targetYear);
    // Fetch the updated record
    return getCandyByCatalogId(catalogId, targetYear)!;
  } else {
    // Get catalog name for denormalization
    const catalogItem = db.prepare("SELECT name FROM candy_catalog WHERE id = ?").get(catalogId) as { name: string } | undefined;
    const candyName = catalogItem?.name || "";
    
    const stmt = db.prepare(
      "INSERT INTO candy_counts (catalog_id, candy_name, count, year) VALUES (?, ?, ?, ?)"
    );
    stmt.run(catalogId, candyName, count, targetYear);
    // Fetch the newly created record
    const newId = db.prepare("SELECT last_insert_rowid()").get() as { "last_insert_rowid()": number };
    return getCandyById(newId["last_insert_rowid()"])!;
  }
}

/**
 * Delete a candy by ID
 */
export function deleteCandyById(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM candy_counts WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Delete a candy by name and year (deprecated - kept for backwards compatibility)
 * @deprecated Use deleteCandyById instead
 */
export function deleteCandy(candyName: string, year?: number): boolean {
  const db = getDb();
  const targetYear = year ?? getCurrentYear();
  const stmt = db.prepare(`
    DELETE FROM candy_counts 
    WHERE id IN (
      SELECT cc.id FROM candy_counts cc
      LEFT JOIN candy_catalog cat ON cc.catalog_id = cat.id
      WHERE (cat.name = ? OR cc.candy_name = ?) AND cc.year = ?
    )
  `);
  const result = stmt.run(candyName, candyName, targetYear);
  return result.changes > 0;
}

/**
 * Reset all candy counts to zero for a specific year
 */
export function resetAllCandies(year?: number): void {
  const db = getDb();
  if (year !== undefined) {
    db.prepare("UPDATE candy_counts SET count = 0 WHERE year = ?").run(year);
  } else {
    db.prepare("UPDATE candy_counts SET count = 0").run();
  }
}

