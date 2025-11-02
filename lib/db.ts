import Database from "better-sqlite3";
import { join } from "path";

let db: Database.Database | null = null;

/**
 * Get or create the database connection
 * Singleton pattern to ensure only one connection
 */
export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  // Create database in the project root
  const dbPath = join(process.cwd(), "candy-counter.db");
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma("foreign_keys = ON");
  
  // Initialize schema
  initializeSchema(db);
  
  return db;
}

/**
 * Initialize the database schema
 */
function initializeSchema(database: Database.Database) {
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
    const tableInfo = database.prepare("PRAGMA table_info(candy_counts)").all() as Array<{ name: string; type: string }>;
    const hasYearColumn = tableInfo.some((col) => col.name === "year");

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
    const candyTableInfo = database.prepare("PRAGMA table_info(candy_counts)").all() as Array<{ name: string; type: string }>;
    const hasCatalogIdColumn = candyTableInfo.some((col) => col.name === "catalog_id");

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
 */
function migrateCatalogData(database: Database.Database) {
  try {
    // Check if catalog is already populated by checking if any candy_counts have catalog_id set
    const checkStmt = database.prepare(`
      SELECT COUNT(*) as count 
      FROM candy_counts 
      WHERE catalog_id IS NOT NULL
    `);
    const result = checkStmt.get() as { count: number };
    
    // If catalog_id is already set, migration has been run
    if (result.count > 0) {
      return;
    }

    // Get all distinct candy names from candy_counts
    const distinctNames = database.prepare(`
      SELECT DISTINCT candy_name 
      FROM candy_counts 
      WHERE candy_name IS NOT NULL AND candy_name != ''
    `).all() as Array<{ candy_name: string }>;

    if (distinctNames.length === 0) {
      return; // No data to migrate
    }

    // Populate catalog from existing candy names
    const insertStmt = database.prepare(`
      INSERT OR IGNORE INTO candy_catalog (name) 
      VALUES (?)
    `);

    for (const row of distinctNames) {
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

/**
 * Close the database connection (useful for cleanup)
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

