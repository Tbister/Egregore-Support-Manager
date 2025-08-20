import Database from 'better-sqlite3';
import { config } from '../config.js';
import { createLogger } from '../utils/logger.js';
import path from 'path';
import { mkdir } from 'fs/promises';

const log = createLogger('db:setup');

let db: Database.Database | null = null;

export async function setupDatabase(): Promise<Database.Database> {
  if (db) return db;
  
  try {
    // Ensure directory exists
    const dbDir = path.dirname(config.DB_PATH);
    await mkdir(dbDir, { recursive: true });
    
    // Open database
    db = new Database(config.DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Create tables
    db.exec(`
      -- Documents table
      CREATE TABLE IF NOT EXISTS docs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        vendor TEXT,
        family TEXT,
        model TEXT,
        file_path TEXT NOT NULL,
        page_count INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(file_path)
      );
      
      -- Chunks table
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        page_start INTEGER NOT NULL,
        page_end INTEGER NOT NULL,
        embedding BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doc_id) REFERENCES docs(id) ON DELETE CASCADE
      );
      
      -- FTS5 table for full-text search
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        text,
        content=chunks,
        content_rowid=id
      );
      
      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunks_fts(rowid, text) VALUES (new.id, new.text);
      END;
      
      CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
        DELETE FROM chunks_fts WHERE rowid = old.id;
      END;
      
      CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
        UPDATE chunks_fts SET text = new.text WHERE rowid = new.id;
      END;
      
      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_pages ON chunks(page_start, page_end);
      CREATE INDEX IF NOT EXISTS idx_docs_vendor ON docs(vendor);
      CREATE INDEX IF NOT EXISTS idx_docs_family ON docs(family);
      CREATE INDEX IF NOT EXISTS idx_docs_model ON docs(model);
    `);
    
    log.info('Database initialized successfully');
    return db;
  } catch (error) {
    log.error('Failed to setup database:', error);
    throw error;
  }
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close();
    db = null;
    log.info('Database closed');
  }
}