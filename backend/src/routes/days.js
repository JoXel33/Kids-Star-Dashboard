import express from 'express';

export function createDaysRouter({ agendaService, starService, recurrenceService, authMiddleware }) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/:date', (req, res, next) => {
    try {
      const day = agendaService.getDay(req.child.id, req.params.date);
      res.json({ day });
    } catch (e) { next(e); }
  });

  router.put('/:date/agenda/:hour', (req, res, next) => {
    try {
      const date = req.params.date;
      const hour = Number.parseInt(req.params.hour, 10);
      const { activity = '', clientDate, clientTime } = req.body || {};
      const entry = agendaService.saveAgendaEntry(
        req.child.id, date, hour, activity, clientDate, clientTime,
      );
      res.json({ entry });
    } catch (e) { next(e); }
  });

  router.put('/:date/star', (req, res, next) => {
    try {
      const date = req.params.date;
      const { earned, clientDate, clientTime } = req.body || {};
      const star = starService.setStar(req.child.id, date, !!earned, clientDate, clientTime);
      res.json({ star });
    } catch (e) { next(e); }
  });

  router.post('/:date/agenda/:hour/recurrence', (req, res, next) => {
    try {
      const date = req.params.date;
      const hour = Number.parseInt(req.params.hour, 10);
      const result = recurrenceService.applyRecurrence(
        req.child.id, date, hour, req.body || {},
      );
      res.json(result);
    } catch (e) { next(e); }
  });

  return router;
}
