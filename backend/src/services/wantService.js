function appError(code, status = 400) {
  const e = new Error(code);
  e.code = code;
  e.status = status;
  return e;
}

const MAX_WANTS = 3;
const MAX_DESC = 60;

export function createWantService(db, walletService) {
  const stmts = {
    list: db.prepare(`
      SELECT id, description, cost, sort_order AS sortOrder
      FROM wants WHERE child_id = ?
      ORDER BY sort_order, id
    `),
    count: db.prepare(`SELECT COUNT(*) AS c FROM wants WHERE child_id = ?`),
    insert: db.prepare(`
      INSERT INTO wants (child_id, description, cost, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    maxSort: db.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) AS m FROM wants WHERE child_id = ?
    `),
    deleteById: db.prepare(`DELETE FROM wants WHERE id = ? AND child_id = ?`),
    findById: db.prepare(`SELECT id, description, cost FROM wants WHERE id = ? AND child_id = ?`),
  };

  return {
    list(childId) {
      return stmts.list.all(childId);
    },

    add(childId, description, cost) {
      if (typeof description !== 'string' || description.length < 1 || description.length > MAX_DESC) {
        throw appError('invalid_input', 400);
      }
      if (!Number.isInteger(cost) || cost < 1 || cost > 5) {
        throw appError('invalid_input', 400);
      }
      const count = stmts.count.get(childId).c;
      if (count >= MAX_WANTS) throw appError('want_limit_reached', 422);
      const sort = stmts.maxSort.get(childId).m + 1;
      const result = stmts.insert.run(childId, description, cost, sort, new Date().toISOString());
      return { id: Number(result.lastInsertRowid), description, cost, sortOrder: sort };
    },

    remove(childId, id) {
      const result = stmts.deleteById.run(id, childId);
      if (result.changes === 0) throw appError('want_not_found', 404);
    },

    redeem(childId, id, clientDate, clientTime) {
      const want = stmts.findById.get(id, childId);
      if (!want) throw appError('want_not_found', 404);
      const wallet = walletService.getWallet(childId, clientDate, clientTime);
      if (wallet.starBalance < want.cost) throw appError('insufficient_balance', 422);

      // Single transaction: delete want, increment stars_spent.
      db.exec('BEGIN');
      try {
        stmts.deleteById.run(id, childId);
        walletService.incrementSpent(childId, want.cost);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return walletService.getWallet(childId, clientDate, clientTime);
    },
  };
}
