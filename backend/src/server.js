import fs from 'node:fs';
import os from 'node:os';
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
  console.log('Kids Star Dashboard listening on:');
  console.log(`  http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) {
        console.log(`  http://${ni.address}:${PORT}    (LAN — accessible from other devices)`);
      }
    }
  }
});
