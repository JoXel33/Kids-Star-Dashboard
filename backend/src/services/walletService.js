import { isValidDate, isValidTime, STAR_LOCK_HHMM } from '../lib/time.js';

function appError(code, status = 400) {
  const e = new Error(code);
  e.code = code;
  e.status = status;
  return e;
}

export function createWalletService(db) {
  const stmts = {
    countPast: db.prepare(`
      SELECT COUNT(*) AS c FROM day_stars
      WHERE child_id = ? AND earned = 1 AND date < ?
    `),
    todayEarned: db.prepare(`
      SELECT earned FROM day_stars WHERE child_id = ? AND date = ?
    `),
    getSpent: db.prepare(`SELECT stars_spent FROM children WHERE id = ?`),
    incSpent: db.prepare(`UPDATE children SET stars_spent = stars_spent + ? WHERE id = ?`),
  };

  return {
    getWallet(childId, clientDate, clientTime) {
      if (!isValidDate(clientDate) || !isValidTime(clientTime)) {
        throw appError('invalid_input', 400);
      }
      const past = stmts.countPast.get(childId, clientDate).c;
      let today = 0;
      if (clientTime >= STAR_LOCK_HHMM) {
        const row = stmts.todayEarned.get(childId, clientDate);
        if (row && row.earned) today = 1;
      }
      const collected = past + today;
      const spentRow = stmts.getSpent.get(childId);
      const spent = spentRow ? spentRow.stars_spent : 0;
      return { starsCollected: collected, starsSpent: spent, starBalance: collected - spent };
    },

    incrementSpent(childId, amount) {
      stmts.incSpent.run(amount, childId);
    },
  };
}
