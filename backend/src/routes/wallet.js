import express from 'express';
import { isValidDate, isValidTime } from '../lib/time.js';

function appError(code, status = 400) {
  const e = new Error(code);
  e.code = code;
  e.status = status;
  return e;
}

export function createWalletRouter({ walletService, authMiddleware }) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', (req, res, next) => {
    try {
      const { clientDate, clientTime } = req.query;
      if (!isValidDate(clientDate) || !isValidTime(clientTime)) {
        throw appError('invalid_input', 400);
      }
      const wallet = walletService.getWallet(req.child.id, clientDate, clientTime);
      res.json({ wallet });
    } catch (e) { next(e); }
  });

  return router;
}
