import express from 'express';

export function createChildrenRouter({ childService, authMiddleware }) {
  const router = express.Router();

  router.post('/', (req, res, next) => {
    try {
      const result = childService.createChild(req.body || {});
      res.status(201).json(result);
    } catch (e) { next(e); }
  });

  router.get('/me', authMiddleware, (req, res) => {
    res.json({ child: req.child });
  });

  router.patch('/me', authMiddleware, (req, res, next) => {
    try {
      const child = childService.updateName(req.child.id, (req.body || {}).name);
      res.json({ child });
    } catch (e) { next(e); }
  });

  router.delete('/me', authMiddleware, (req, res, next) => {
    try {
      childService.deleteChild(req.child.id);
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}
