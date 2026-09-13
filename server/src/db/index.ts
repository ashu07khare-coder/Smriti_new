import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DDL } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store database file in server/data/smriti.db
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'smriti.db');
export const db = new Database(dbPath);

// Enable foreign keys and WAL mode for fast concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Execute table definitions
db.exec(DDL);

/**
 * Record a mutation to the sync changelog so offline clients can fetch deltas
 */
export function recordChangelog(
  entityType: string,
  entityId: string,
  operation: 'UPSERT' | 'DELETE',
  payload: Record<string, unknown>
): void {
  const now = Date.now();
  const id = `cl-${now}-${Math.random().toString(36).substring(2, 8)}`;
  const stmt = db.prepare(`
    INSERT INTO sync_changelog (id, entity_type, entity_id, operation, payload_json, version_ts)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, entityType, entityId, operation, JSON.stringify(payload), now);
}

export default db;
