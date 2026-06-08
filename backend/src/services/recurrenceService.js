// Recurrence service for feature 002 (Recurring agenda items).
// Per research.md §2, fan-out is implemented as a single prepared INSERT…ON CONFLICT
// upsert wrapped in BEGIN/COMMIT, with ROLLBACK on any error (FR-018, SC-008).

export const RECURRENCE_ERROR_CODES = Object.freeze({
  invalid_input: 'invalid_input',
  source_not_found: 'source_not_found',
  source_empty: 'source_empty',
  source_elapsed: 'source_elapsed',
  invalid_until_date: 'invalid_until_date',
  until_not_future: 'until_not_future',
  until_too_far: 'until_too_far',
});

const VALID_TYPES = new Set(['daily', 'weekly']);

function appError(code, status, message = code) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  return e;
}

export function createRecurrenceService(db, timeLib) {
  if (!db) throw new Error('createRecurrenceService: db required');
  if (!timeLib) throw new Error('createRecurrenceService: timeLib required');

  const {
    isValidDate, isValidTime, isValidHour,
    isBlockElapsed,
    addDays, enumerateDailyDates, enumerateMatchingWeekdays, capUntil,
  } = timeLib;

  const stmts = {
    selectSource: db.prepare(
      `SELECT activity FROM agenda_entries WHERE child_id = ? AND date = ? AND hour = ?`,
    ),
    upsertEntry: db.prepare(
      `INSERT INTO agenda_entries (child_id, date, hour, activity)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (child_id, date, hour) DO UPDATE SET activity = excluded.activity`,
    ),
  };

  function validateInput(sourceDate, sourceHour, body) {
    if (!body || typeof body !== 'object') throw appError('invalid_input', 400);
    const { type, until, clientDate, clientTime } = body;
    if (!VALID_TYPES.has(type)) throw appError('invalid_input', 400);
    if (!isValidDate(clientDate) || !isValidTime(clientTime)) {
      throw appError('invalid_input', 400);
    }
    if (!isValidDate(sourceDate) || !isValidHour(sourceHour)) {
      throw appError('invalid_input', 400);
    }
    if (typeof until !== 'string') throw appError('invalid_until_date', 422);
    // YYYY-MM-DD shape AND round-trip date (rejects 2026-02-30, 2026-13-01, etc.).
    if (!isValidDate(until) || !isRoundTripDate(until)) {
      throw appError('invalid_until_date', 422);
    }
    if (until <= sourceDate) throw appError('until_not_future', 422);
    if (until > capUntil(clientDate, 90)) throw appError('until_too_far', 422);
    return { type, until, clientDate, clientTime };
  }

  function loadSource(childId, sourceDate, sourceHour, clientDate, clientTime) {
    const row = stmts.selectSource.get(childId, sourceDate, sourceHour);
    if (!row) throw appError('source_not_found', 404);
    if (!row.activity || row.activity === '') throw appError('source_empty', 422);
    if (isBlockElapsed(sourceDate, sourceHour, clientDate, clientTime)) {
      throw appError('source_elapsed', 422);
    }
    return row.activity;
  }

  function enumerateTargets(type, sourceDate, until) {
    if (type === 'daily') return enumerateDailyDates(sourceDate, until);
    return enumerateMatchingWeekdays(sourceDate, until); // weekly — wired by US2 (T023)
  }

  function fanOutAtomically(childId, sourceHour, activity, targets) {
    db.exec('BEGIN');
    try {
      for (const date of targets) {
        stmts.upsertEntry.run(childId, date, sourceHour, activity);
      }
      db.exec('COMMIT');
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* ignore secondary error */ }
      throw e;
    }
  }

  return {
    applyRecurrence(childId, sourceDate, sourceHour, body) {
      const { type, until, clientDate, clientTime } = validateInput(sourceDate, sourceHour, body);
      const activity = loadSource(childId, sourceDate, sourceHour, clientDate, clientTime);
      const dates = enumerateTargets(type, sourceDate, until);
      fanOutAtomically(childId, sourceHour, activity, dates);
      return { created: dates.length, dates };
    },
  };
}

// Returns true iff `s` (already known to match YYYY-MM-DD shape) is a valid calendar
// date — guards against 2026-02-30, 2026-13-01, etc.
function isRoundTripDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y
      && dt.getUTCMonth() === m - 1
      && dt.getUTCDate() === d;
}

// Tiny helper exposed only for tests / readability — not used at runtime.
export const _internals = { isRoundTripDate };
