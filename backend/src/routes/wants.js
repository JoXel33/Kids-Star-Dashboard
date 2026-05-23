import express from 'express';

function appError(code, status = 400) {
  const e = new Error(code);
  e.code = code;
  e.status = status;
  return e;
}

export function createWantsRouter({ wantService, authMiddleware }) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', (req, res, next) => {
    try {
      res.json({ wants: wantService.list(req.child.id) });
    } catch (e) { next(e); }
  });

  router.post('/', (req, res, next) => {
    try {
      const { description, cost } = req.body || {};
      const want = wantService.add(req.child.id, description, cost);
      res.status(201).json({ want });
    } catch (e) { next(e); }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) throw appError('invalid_input', 400);
      wantService.remove(req.child.id, id);
      res.status(204).end();
    } catch (e) { next(e); }
  });

  router.post('/:id/redeem', (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0) throw appError('invalid_input', 400);
      const { clientDate, clientTime } = req.body || {};
      const wallet = wantService.redeem(req.child.id, id, clientDate, clientTime);
      res.json({ wallet });
    } catch (e) { next(e); }
  });

  return router;
}
