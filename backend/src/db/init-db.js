import fs from 'node:fs';
import path from 'node:path';
import { openDb, applySchema } from './index.js';

const dbPath = process.env.DB_PATH || './data/dashboard.sqlite';
if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db = openDb(dbPath);
applySchema(db);
console.log('Database initialized at', dbPath);
db.close();
