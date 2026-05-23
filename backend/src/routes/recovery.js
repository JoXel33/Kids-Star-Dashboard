import express from 'express';

export function createRecoveryRouter({ childService }) {
  const router = express.Router();

  router.post('/', (req, res, next) => {
    try {
      const result = childService.recover(req.body || {});
      res.json(result);
    } catch (e) { next(e); }
  });

  return router;
}
