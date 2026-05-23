import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createHash } from './lib/hash.js';
import { createChildService } from './services/childService.js';
import { createAgendaService } from './services/agendaService.js';
import { createStarService } from './services/starService.js';
import { createWalletService } from './services/walletService.js';
import { createWantService } from './services/wantService.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createChildrenRouter } from './routes/children.js';
import { createSessionsRouter } from './routes/sessions.js';
import { createRecoveryRouter } from './routes/recovery.js';
import { createDaysRouter } from './routes/days.js';
import { createWalletRouter } from './routes/wallet.js';
import { createWantsRouter } from './routes/wants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

export function createApp(db, options = {}) {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const secret = options.serverSecret || process.env.SERVER_SECRET;
  if (!secret) throw new Error('SERVER_SECRET is required (env or createApp options)');
  const hash = createHash(secret);

  const childService = createChildService(db, hash);
  const agendaService = createAgendaService(db);
  const starService = createStarService(db);
  const walletService = createWalletService(db);
  const wantService = createWantService(db, walletService);
  const authMiddleware = createAuthMiddleware(childService);

  app.use('/api/children', createChildrenRouter({ childService, authMiddleware }));
  app.use('/api/sessions', createSessionsRouter({ childService }));
  app.use('/api/recovery', createRecoveryRouter({ childService }));
  app.use('/api/days', createDaysRouter({ agendaService, starService, authMiddleware }));
  app.use('/api/wallet', createWalletRouter({ walletService, authMiddleware }));
  app.use('/api/wants', createWantsRouter({ wantService, authMiddleware }));

  app.use(express.static(FRONTEND_DIR));

  app.use((err, req, res, _next) => {
    const status = err.status || statusFor(err.code) || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      error: { code: err.code || 'internal', message: err.message || 'Internal error' },
    });
  });

  return app;
}

function statusFor(code) {
  switch (code) {
    case 'access_code_taken':
    case 'recovery_ambiguous':
      return 409;
    case 'invalid_access_code':
    case 'recovery_no_match':
    case 'unauthorized':
      return 401;
    case 'star_not_today':
    case 'star_locked':
    case 'block_elapsed':
    case 'insufficient_balance':
    case 'want_limit_reached':
      return 422;
    case 'want_not_found':
    case 'not_found':
      return 404;
    case 'invalid_input':
      return 400;
    default:
      return null;
  }
}
