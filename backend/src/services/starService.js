import { canToggleStar, isValidDate, isValidTime } from '../lib/time.js';

function appError(code, status = 400) {
  const e = new Error(code);
  e.code = code;
  e.status = status;
  return e;
}

export function createStarService(db) {
  const stmts = {
    upsert: db.prepare(`
      INSERT INTO day_stars (child_id, date, earned) VALUES (?, ?, ?)
      ON CONFLICT (child_id, date) DO UPDATE SET earned = excluded.earned
    `),
  };

  return {
    setStar(childId, date, earned, clientDate, clientTime) {
      if (!isValidDate(date) || !isValidDate(clientDate) || !isValidTime(clientTime)) {
        throw appError('invalid_input', 400);
      }
      const check = canToggleStar(date, clientDate, clientTime);
      if (!check.ok) throw appError(check.code, 422);
      stmts.upsert.run(childId, date, earned ? 1 : 0);
      return { earned: !!earned };
    },
  };
}
