import express from 'express';

export function createSessionsRouter({ childService, authMiddleware }) {
  const router = express.Router();

  router.post('/', (req, res, next) => {
    try {
      const { accessCode } = req.body || {};
      const result = childService.login(accessCode);
      res.json(result);
    } catch (e) { next(e); }
  });

  router.delete('/', authMiddleware, (req, res, next) => {
    try {
      childService.logout(req.sessionToken);
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}
