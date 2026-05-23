import { randomBytes } from 'node:crypto';

const SESSION_TTL_DAYS = 90;

function genToken() {
  return randomBytes(32).toString('hex');
}

function isoNow() {
  return new Date().toISOString();
}

function isoFutureDays(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function appError(code, status = 400, message = code) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  return e;
}

export function createChildService(db, hash) {
  const stmts = {
    insertChild: db.prepare(`
      INSERT INTO children (name, access_code_hash, recovery_answer_hash, created_date, stars_spent, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `),
    findByAccessCode: db.prepare(`
      SELECT id, name, created_date, stars_spent, created_at FROM children WHERE access_code_hash = ?
    `),
    findByNameAndRecovery: db.prepare(`
      SELECT id, name, created_date, stars_spent, created_at FROM children
      WHERE name = ? AND recovery_answer_hash = ?
    `),
    updateAccessCode: db.prepare(`UPDATE children SET access_code_hash = ? WHERE id = ?`),
    findById: db.prepare(`
      SELECT id, name, created_date, stars_spent, created_at FROM children WHERE id = ?
    `),
    updateName: db.prepare(`UPDATE children SET name = ? WHERE id = ?`),
    deleteChild: db.prepare(`DELETE FROM children WHERE id = ?`),
    insertSession: db.prepare(`
      INSERT INTO sessions (token, child_id, created_at, expires_at) VALUES (?, ?, ?, ?)
    `),
    findSession: db.prepare(`SELECT token, child_id, expires_at FROM sessions WHERE token = ?`),
    deleteSession: db.prepare(`DELETE FROM sessions WHERE token = ?`),
  };

  function toChild(row) {
    if (!row) return null;
    return { id: row.id, name: row.name, createdDate: row.created_date };
  }

  function createSession(childId) {
    const token = genToken();
    stmts.insertSession.run(token, childId, isoNow(), isoFutureDays(SESSION_TTL_DAYS));
    return token;
  }

  return {
    createChild({ name, accessCode, recoveryAnswer, createdDate }) {
      if (!accessCode || !recoveryAnswer || !createdDate) {
        throw appError('invalid_input', 400, 'accessCode, recoveryAnswer, createdDate required');
      }
      const codeHash = hash(accessCode);
      const answerHash = hash(recoveryAnswer);
      let result;
      try {
        result = stmts.insertChild.run(name || '', codeHash, answerHash, createdDate, isoNow());
      } catch (e) {
        if (/UNIQUE/.test(e.message)) throw appError('access_code_taken', 409);
        throw e;
      }
      const id = Number(result.lastInsertRowid);
      const row = stmts.findById.get(id);
      const token = createSession(id);
      return { sessionToken: token, child: toChild(row) };
    },

    login(accessCode) {
      if (!accessCode) throw appError('invalid_input', 400);
      const row = stmts.findByAccessCode.get(hash(accessCode));
      if (!row) throw appError('invalid_access_code', 401);
      const token = createSession(row.id);
      return { sessionToken: token, child: toChild(row) };
    },

    recover({ name, recoveryAnswer, newAccessCode }) {
      if (name == null || !recoveryAnswer || !newAccessCode) throw appError('invalid_input', 400);
      const matches = stmts.findByNameAndRecovery.all(String(name), hash(recoveryAnswer));
      if (matches.length === 0) throw appError('recovery_no_match', 401);
      if (matches.length > 1) throw appError('recovery_ambiguous', 409);
      const c = matches[0];
      const newHash = hash(newAccessCode);
      try {
        stmts.updateAccessCode.run(newHash, c.id);
      } catch (e) {
        if (/UNIQUE/.test(e.message)) throw appError('access_code_taken', 409);
        throw e;
      }
      const token = createSession(c.id);
      return { sessionToken: token, child: toChild(c) };
    },

    getProfile(childId) {
      return toChild(stmts.findById.get(childId));
    },

    updateName(childId, name) {
      stmts.updateName.run(name == null ? '' : String(name), childId);
      return toChild(stmts.findById.get(childId));
    },

    deleteChild(childId) {
      stmts.deleteChild.run(childId);
    },

    validateSession(token) {
      if (!token) return null;
      const row = stmts.findSession.get(token);
      if (!row) return null;
      if (row.expires_at < isoNow()) {
        stmts.deleteSession.run(token);
        return null;
      }
      const c = stmts.findById.get(row.child_id);
      if (!c) {
        stmts.deleteSession.run(token);
        return null;
      }
      return toChild(c);
    },
  };
}
