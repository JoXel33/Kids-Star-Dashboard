import express from 'express';

export function createSessionsRouter({ childService }) {
  const router = express.Router();

  router.post('/', (req, res, next) => {
    try {
      const { accessCode } = req.body || {};
      const result = childService.login(accessCode);
      res.json(result);
    } catch (e) { next(e); }
  });

  return router;
}
