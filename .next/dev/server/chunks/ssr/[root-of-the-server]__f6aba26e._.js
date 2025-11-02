module.exports = [
"[externals]/better-sqlite3 [external] (better-sqlite3, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("better-sqlite3", () => require("better-sqlite3"));

module.exports = mod;
}),
"[project]/repos/candy-counter/candy-counter/lib/db.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "closeDb",
    ()=>closeDb,
    "getDb",
    ()=>getDb
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/better-sqlite3 [external] (better-sqlite3, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
let db = null;
function getDb() {
    if (db) {
        return db;
    }
    // Create database in the project root
    const dbPath = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["join"])(process.cwd(), "candy-counter.db");
    db = new __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$29$__["default"](dbPath);
    // Enable foreign keys
    db.pragma("foreign_keys = ON");
    // Initialize schema
    initializeSchema(db);
    return db;
}
/**
 * Initialize the database schema
 */ function initializeSchema(database) {
    const currentYear = new Date().getFullYear();
    // Create candy counts table
    database.exec(`
    CREATE TABLE IF NOT EXISTS candy_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candy_name TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      year INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(candy_name, year)
    );
  `);
    // Migration: Add year column if it doesn't exist
    try {
        const tableInfo = database.prepare("PRAGMA table_info(candy_counts)").all();
        const hasYearColumn = tableInfo.some((col)=>col.name === "year");
        if (!hasYearColumn) {
            // Add year column
            database.exec(`
        ALTER TABLE candy_counts ADD COLUMN year INTEGER;
      `);
            // Migrate existing records to current year
            database.exec(`
        UPDATE candy_counts SET year = ${currentYear} WHERE year IS NULL;
      `);
            // Make year NOT NULL after populating
            database.exec(`
        CREATE TABLE candy_counts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candy_name TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          year INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(candy_name, year)
        );
      `);
            database.exec(`
        INSERT INTO candy_counts_new (id, candy_name, count, year, created_at, updated_at)
        SELECT id, candy_name, count, year, created_at, updated_at FROM candy_counts;
      `);
            database.exec(`
        DROP TABLE candy_counts;
      `);
            database.exec(`
        ALTER TABLE candy_counts_new RENAME TO candy_counts;
      `);
            // Drop old index if it exists
            try {
                database.exec(`DROP INDEX IF EXISTS idx_candy_name;`);
            } catch (e) {
            // Index might not exist, ignore
            }
        }
    // Drop old unique constraint on candy_name if it exists
    // SQLite doesn't support dropping constraints directly, handled via table recreation above
    } catch (e) {
        // If migration fails, continue (might already be migrated)
        console.error("Migration error (may be expected):", e);
    }
    // Create index on candy_name and year for faster lookups
    database.exec(`
    CREATE INDEX IF NOT EXISTS idx_candy_name_year ON candy_counts(candy_name, year);
  `);
    // Create trigger to update updated_at timestamp
    database.exec(`
    CREATE TRIGGER IF NOT EXISTS update_candy_counts_timestamp 
    AFTER UPDATE ON candy_counts
    BEGIN
      UPDATE candy_counts 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = NEW.id;
    END;
  `);
    // ===== CANDY CATALOG MIGRATION =====
    // Create candy_catalog table
    database.exec(`
    CREATE TABLE IF NOT EXISTS candy_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Create trigger to update updated_at timestamp for catalog
    database.exec(`
    CREATE TRIGGER IF NOT EXISTS update_candy_catalog_timestamp 
    AFTER UPDATE ON candy_catalog
    BEGIN
      UPDATE candy_catalog 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = NEW.id;
    END;
  `);
    // Migration: Add catalog_id column if it doesn't exist
    try {
        const candyTableInfo = database.prepare("PRAGMA table_info(candy_counts)").all();
        const hasCatalogIdColumn = candyTableInfo.some((col)=>col.name === "catalog_id");
        if (!hasCatalogIdColumn) {
            // Add catalog_id column (nullable initially)
            database.exec(`
        ALTER TABLE candy_counts ADD COLUMN catalog_id INTEGER;
      `);
            // Create index on catalog_id for performance
            database.exec(`
        CREATE INDEX IF NOT EXISTS idx_candy_catalog_id ON candy_counts(catalog_id);
      `);
        }
    } catch (e) {
        console.error("Catalog migration error (may be expected):", e);
    }
    // Run migration to populate catalog and link existing records
    migrateCatalogData(database);
}
/**
 * Migrate existing candy_name data to catalog system
 */ function migrateCatalogData(database) {
    try {
        // Check if catalog is already populated by checking if any candy_counts have catalog_id set
        const checkStmt = database.prepare(`
      SELECT COUNT(*) as count 
      FROM candy_counts 
      WHERE catalog_id IS NOT NULL
    `);
        const result = checkStmt.get();
        // If catalog_id is already set, migration has been run
        if (result.count > 0) {
            return;
        }
        // Get all distinct candy names from candy_counts
        const distinctNames = database.prepare(`
      SELECT DISTINCT candy_name 
      FROM candy_counts 
      WHERE candy_name IS NOT NULL AND candy_name != ''
    `).all();
        if (distinctNames.length === 0) {
            return; // No data to migrate
        }
        // Populate catalog from existing candy names
        const insertStmt = database.prepare(`
      INSERT OR IGNORE INTO candy_catalog (name) 
      VALUES (?)
    `);
        for (const row of distinctNames){
            insertStmt.run(row.candy_name);
        }
        // Link existing candy_counts records to catalog
        const linkStmt = database.prepare(`
      UPDATE candy_counts 
      SET catalog_id = (
        SELECT id 
        FROM candy_catalog 
        WHERE name = candy_counts.candy_name 
        LIMIT 1
      )
      WHERE catalog_id IS NULL
    `);
        linkStmt.run();
    } catch (e) {
        console.error("Catalog data migration error:", e);
    }
}
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
}),
"[project]/repos/candy-counter/candy-counter/lib/candy.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decrementCandy",
    ()=>decrementCandy,
    "deleteCandy",
    ()=>deleteCandy,
    "deleteCandyById",
    ()=>deleteCandyById,
    "getAllCandies",
    ()=>getAllCandies,
    "getAvailableYears",
    ()=>getAvailableYears,
    "getCandiesByYear",
    ()=>getCandiesByYear,
    "getCandyByCatalogId",
    ()=>getCandyByCatalogId,
    "getCandyById",
    ()=>getCandyById,
    "getCandyByName",
    ()=>getCandyByName,
    "getCurrentYear",
    ()=>getCurrentYear,
    "incrementCandy",
    ()=>incrementCandy,
    "resetAllCandies",
    ()=>resetAllCandies,
    "setCandyCount",
    ()=>setCandyCount
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/lib/db.ts [app-rsc] (ecmascript)");
;
function getCurrentYear() {
    return new Date().getFullYear();
}
function getAllCandies(year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
        return stmt.all(year);
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
    return stmt.all();
}
function getCandiesByYear(year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
    return stmt.all(year);
}
function getAvailableYears() {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const stmt = db.prepare("SELECT DISTINCT year FROM candy_counts ORDER BY year DESC");
    const results = stmt.all();
    return results.map((r)=>r.year);
}
function getCandyByName(candyName, year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
    const candy = stmt.get(candyName, candyName, targetYear);
    return candy || null;
}
function getCandyByCatalogId(catalogId, year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
    const candy = stmt.get(catalogId, targetYear);
    return candy || null;
}
function getCandyById(id) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
    const candy = stmt.get(id);
    return candy || null;
}
function incrementCandy(catalogId, amount = 1, year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const targetYear = year ?? getCurrentYear();
    // Try to get existing candy
    const existing = db.prepare(`
    SELECT * FROM candy_counts 
    WHERE catalog_id = ? AND year = ?
  `).get(catalogId, targetYear);
    if (existing) {
        // Update existing
        const stmt = db.prepare("UPDATE candy_counts SET count = count + ? WHERE catalog_id = ? AND year = ?");
        stmt.run(amount, catalogId, targetYear);
        // Fetch the updated record
        return getCandyById(existing.id);
    } else {
        // Get catalog name for denormalization
        const catalogItem = db.prepare("SELECT name FROM candy_catalog WHERE id = ?").get(catalogId);
        const candyName = catalogItem?.name || "";
        // Create new
        const stmt = db.prepare("INSERT INTO candy_counts (catalog_id, candy_name, count, year) VALUES (?, ?, ?, ?)");
        stmt.run(catalogId, candyName, amount, targetYear);
        // Fetch the newly created record
        const newId = db.prepare("SELECT last_insert_rowid()").get();
        return getCandyById(newId["last_insert_rowid()"]);
    }
}
function decrementCandy(catalogId, amount = 1, year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const targetYear = year ?? getCurrentYear();
    const existing = getCandyByCatalogId(catalogId, targetYear);
    if (!existing) {
        return null;
    }
    const newCount = Math.max(0, existing.count - amount);
    const stmt = db.prepare("UPDATE candy_counts SET count = ? WHERE catalog_id = ? AND year = ?");
    stmt.run(newCount, catalogId, targetYear);
    // Fetch the updated record
    return getCandyByCatalogId(catalogId, targetYear);
}
function setCandyCount(catalogId, count, year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const targetYear = year ?? getCurrentYear();
    const existing = getCandyByCatalogId(catalogId, targetYear);
    if (existing) {
        const stmt = db.prepare("UPDATE candy_counts SET count = ? WHERE catalog_id = ? AND year = ?");
        stmt.run(count, catalogId, targetYear);
        // Fetch the updated record
        return getCandyByCatalogId(catalogId, targetYear);
    } else {
        // Get catalog name for denormalization
        const catalogItem = db.prepare("SELECT name FROM candy_catalog WHERE id = ?").get(catalogId);
        const candyName = catalogItem?.name || "";
        const stmt = db.prepare("INSERT INTO candy_counts (catalog_id, candy_name, count, year) VALUES (?, ?, ?, ?)");
        stmt.run(catalogId, candyName, count, targetYear);
        // Fetch the newly created record
        const newId = db.prepare("SELECT last_insert_rowid()").get();
        return getCandyById(newId["last_insert_rowid()"]);
    }
}
function deleteCandyById(id) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const stmt = db.prepare("DELETE FROM candy_counts WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
}
function deleteCandy(candyName, year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
function resetAllCandies(year) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    if (year !== undefined) {
        db.prepare("UPDATE candy_counts SET count = 0 WHERE year = ?").run(year);
    } else {
        db.prepare("UPDATE candy_counts SET count = 0").run();
    }
}
}),
"[project]/repos/candy-counter/candy-counter/lib/catalog.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "activateCatalogItem",
    ()=>activateCatalogItem,
    "createCatalogItem",
    ()=>createCatalogItem,
    "deactivateCatalogItem",
    ()=>deactivateCatalogItem,
    "getAllCatalogItems",
    ()=>getAllCatalogItems,
    "getCatalogItemById",
    ()=>getCatalogItemById,
    "getCatalogItemByName",
    ()=>getCatalogItemByName,
    "mergeCatalogItems",
    ()=>mergeCatalogItems,
    "updateCatalogItem",
    ()=>updateCatalogItem
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/lib/db.ts [app-rsc] (ecmascript)");
;
function getAllCatalogItems(includeInactive = false) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    if (includeInactive) {
        const stmt = db.prepare("SELECT * FROM candy_catalog ORDER BY name");
        return stmt.all();
    } else {
        const stmt = db.prepare("SELECT * FROM candy_catalog WHERE is_active = 1 ORDER BY name");
        return stmt.all();
    }
}
function getCatalogItemById(id) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const stmt = db.prepare("SELECT * FROM candy_catalog WHERE id = ?");
    const item = stmt.get(id);
    return item || null;
}
function getCatalogItemByName(name) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const stmt = db.prepare("SELECT * FROM candy_catalog WHERE name = ?");
    const item = stmt.get(name);
    return item || null;
}
function createCatalogItem(name, description) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
function updateCatalogItem(id, name, description) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
function deactivateCatalogItem(id) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const existing = getCatalogItemById(id);
    if (!existing) {
        return false;
    }
    const stmt = db.prepare("UPDATE candy_catalog SET is_active = 0 WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
}
function activateCatalogItem(id) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const existing = getCatalogItemById(id);
    if (!existing) {
        return false;
    }
    const stmt = db.prepare("UPDATE candy_catalog SET is_active = 1 WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
}
function mergeCatalogItems(sourceId, targetId) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
    const source = getCatalogItemById(sourceId);
    const target = getCatalogItemById(targetId);
    if (!source || !target) {
        throw new Error("Source or target catalog item not found");
    }
    if (sourceId === targetId) {
        throw new Error("Cannot merge catalog item with itself");
    }
    // Use a transaction to ensure atomicity
    const transaction = db.transaction(()=>{
        // First, get all records that need to be merged
        const sourceRecords = db.prepare(`
      SELECT * FROM candy_counts WHERE catalog_id = ?
    `).all(sourceId);
        for (const record of sourceRecords){
            // Check if target already has a record for this year
            const existingTarget = db.prepare(`
        SELECT * FROM candy_counts 
        WHERE catalog_id = ? AND year = ?
      `).get(targetId, record.year);
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
}),
"[project]/repos/candy-counter/candy-counter/app/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00b07d2af22679015b9a378c274a5d9d99b9ff8ded":"getAvailableYearsAction","401fb996a3d259d978963ea9fbbdd2aee17009d593":"activateCatalogItemAction","40274852bf4dc49511e372ce0071f7fe6d44aba2ae":"getAllCandiesAction","4089442ab9ca30809a71e839ff8ba121c4d9e76934":"getAllCatalogItemsAction","40a05f9241e92e8314d32ec08673be86daf71b00ff":"getCandiesByYearAction","40cc73549640befa7f25c4d2d6e1f025e75a359b00":"deactivateCatalogItemAction","40d9f9ae5c1043c46ce5cc9ee55864022f6b9496fc":"deleteCandy","6012bac9a2901dc4d1616baeacb273d60c444e8603":"mergeCatalogItemsAction","603b773387d958e80d02013679d84da904053d58d1":"createCatalogItemAction","603c626a45f03fc635d3c576003b0595c25c09bdfb":"addCandy","7059e609926d9857bcfd1d917e665406438267c074":"updateCandy","70bf5b2b226cab423a74985f4fb03729a7d5e74b3d":"updateCatalogItemAction"},"",""] */ __turbopack_context__.s([
    "activateCatalogItemAction",
    ()=>activateCatalogItemAction,
    "addCandy",
    ()=>addCandy,
    "createCatalogItemAction",
    ()=>createCatalogItemAction,
    "deactivateCatalogItemAction",
    ()=>deactivateCatalogItemAction,
    "deleteCandy",
    ()=>deleteCandy,
    "getAllCandiesAction",
    ()=>getAllCandiesAction,
    "getAllCatalogItemsAction",
    ()=>getAllCatalogItemsAction,
    "getAvailableYearsAction",
    ()=>getAvailableYearsAction,
    "getCandiesByYearAction",
    ()=>getCandiesByYearAction,
    "mergeCatalogItemsAction",
    ()=>mergeCatalogItemsAction,
    "updateCandy",
    ()=>updateCandy,
    "updateCatalogItemAction",
    ()=>updateCatalogItemAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/lib/candy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$catalog$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/lib/catalog.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/lib/db.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
async function addCandy(catalogId, quantity) {
    if (!catalogId || catalogId < 1) {
        throw new Error("Valid catalog ID is required");
    }
    if (quantity < 1) {
        throw new Error("Quantity must be at least 1");
    }
    const candy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["incrementCandy"])(catalogId, quantity);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return candy;
}
async function getAllCandiesAction(year) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAllCandies"])(year);
}
async function getCandiesByYearAction(year) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCandiesByYear"])(year);
}
async function getAvailableYearsAction() {
    const years = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAvailableYears"])();
    const currentYear = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCurrentYear"])();
    // Ensure current year is always included even if no data exists yet
    if (!years.includes(currentYear)) {
        return [
            currentYear,
            ...years
        ];
    }
    return years;
}
async function updateCandy(id, catalogId, count) {
    if (!catalogId || catalogId < 1) {
        throw new Error("Valid catalog ID is required");
    }
    if (count < 0) {
        throw new Error("Count cannot be negative");
    }
    const existing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCandyById"])(id);
    if (!existing) {
        throw new Error("Candy not found");
    }
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDb"])();
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
    const catalogItem = db.prepare("SELECT name FROM candy_catalog WHERE id = ?").get(catalogId);
    const candyName = catalogItem?.name || "";
    // Update both catalog_id and count
    const stmt = db.prepare("UPDATE candy_counts SET catalog_id = ?, candy_name = ?, count = ? WHERE id = ?");
    stmt.run(catalogId, candyName, count, id);
    const updated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCandyById"])(id);
    if (!updated) {
        throw new Error("Failed to update candy");
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return updated;
}
async function deleteCandy(id) {
    const existing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCandyById"])(id);
    if (!existing) {
        return false;
    }
    const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$candy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteCandyById"])(id);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return result;
}
async function getAllCatalogItemsAction(includeInactive = false) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$catalog$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAllCatalogItems"])(includeInactive);
}
async function createCatalogItemAction(name, description) {
    if (!name || name.trim() === "") {
        throw new Error("Candy name is required");
    }
    const item = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$catalog$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createCatalogItem"])(name.trim(), description?.trim());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return item;
}
async function updateCatalogItemAction(id, name, description) {
    if (!name || name.trim() === "") {
        throw new Error("Candy name is required");
    }
    const item = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$catalog$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateCatalogItem"])(id, name.trim(), description?.trim());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return item;
}
async function deactivateCatalogItemAction(id) {
    const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$catalog$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deactivateCatalogItem"])(id);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return result;
}
async function activateCatalogItemAction(id) {
    const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$catalog$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["activateCatalogItem"])(id);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return result;
}
async function mergeCatalogItemsAction(sourceId, targetId) {
    const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$lib$2f$catalog$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["mergeCatalogItems"])(sourceId, targetId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return result;
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    addCandy,
    getAllCandiesAction,
    getCandiesByYearAction,
    getAvailableYearsAction,
    updateCandy,
    deleteCandy,
    getAllCatalogItemsAction,
    createCatalogItemAction,
    updateCatalogItemAction,
    deactivateCatalogItemAction,
    activateCatalogItemAction,
    mergeCatalogItemsAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(addCandy, "603c626a45f03fc635d3c576003b0595c25c09bdfb", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getAllCandiesAction, "40274852bf4dc49511e372ce0071f7fe6d44aba2ae", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getCandiesByYearAction, "40a05f9241e92e8314d32ec08673be86daf71b00ff", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getAvailableYearsAction, "00b07d2af22679015b9a378c274a5d9d99b9ff8ded", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateCandy, "7059e609926d9857bcfd1d917e665406438267c074", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteCandy, "40d9f9ae5c1043c46ce5cc9ee55864022f6b9496fc", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getAllCatalogItemsAction, "4089442ab9ca30809a71e839ff8ba121c4d9e76934", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createCatalogItemAction, "603b773387d958e80d02013679d84da904053d58d1", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateCatalogItemAction, "70bf5b2b226cab423a74985f4fb03729a7d5e74b3d", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deactivateCatalogItemAction, "40cc73549640befa7f25c4d2d6e1f025e75a359b00", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(activateCatalogItemAction, "401fb996a3d259d978963ea9fbbdd2aee17009d593", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(mergeCatalogItemsAction, "6012bac9a2901dc4d1616baeacb273d60c444e8603", null);
}),
"[project]/repos/candy-counter/candy-counter/.next-internal/server/app/catalog/page/actions.js { ACTIONS_MODULE0 => \"[project]/repos/candy-counter/candy-counter/app/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/app/actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/repos/candy-counter/candy-counter/.next-internal/server/app/catalog/page/actions.js { ACTIONS_MODULE0 => \"[project]/repos/candy-counter/candy-counter/app/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "401fb996a3d259d978963ea9fbbdd2aee17009d593",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["activateCatalogItemAction"],
    "4089442ab9ca30809a71e839ff8ba121c4d9e76934",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAllCatalogItemsAction"],
    "40cc73549640befa7f25c4d2d6e1f025e75a359b00",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deactivateCatalogItemAction"],
    "6012bac9a2901dc4d1616baeacb273d60c444e8603",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["mergeCatalogItemsAction"],
    "603b773387d958e80d02013679d84da904053d58d1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createCatalogItemAction"],
    "70bf5b2b226cab423a74985f4fb03729a7d5e74b3d",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateCatalogItemAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f2e$next$2d$internal$2f$server$2f$app$2f$catalog$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/repos/candy-counter/candy-counter/.next-internal/server/app/catalog/page/actions.js { ACTIONS_MODULE0 => "[project]/repos/candy-counter/candy-counter/app/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$repos$2f$candy$2d$counter$2f$candy$2d$counter$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/repos/candy-counter/candy-counter/app/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f6aba26e._.js.map