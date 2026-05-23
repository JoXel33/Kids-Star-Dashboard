import fs from 'node:fs';
import path from 'node:path';
import { openDb, applySchema } from './db/index.js';
import { createApp } from './app.js';

const dbPath = process.env.DB_PATH || './data/dashboard.sqlite';
if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db = openDb(dbPath);
applySchema(db);

const PORT = Number(process.env.PORT) || 3000;
const app = createApp(db);
app.listen(PORT, () => {
  console.log(`Kids Star Dashboard listening on http://localhost:${PORT}`);
});
