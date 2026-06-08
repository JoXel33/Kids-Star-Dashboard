import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidDate, isValidTime, isValidHour,
  isBlockElapsed, isCountedDay, canToggleStar,
  STAR_LOCK_HHMM,
  addDays, enumerateDailyDates, enumerateMatchingWeekdays, capUntil,
} from '../../src/lib/time.js';

describe('validators', () => {
  test('isValidDate', () => {
    assert.equal(isValidDate('2026-05-23'), true);
    assert.equal(isValidDate('2026/05/23'), false);
    assert.equal(isValidDate(''), false);
    assert.equal(isValidDate(null), false);
  });
  test('isValidTime', () => {
    assert.equal(isValidTime('00:00'), true);
    assert.equal(isValidTime('21:30'), true);
    assert.equal(isValidTime('21:3'), false);
    assert.equal(isValidTime('2130'), false);
  });
  test('isValidHour (block start 7..20)', () => {
    assert.equal(isValidHour(7), true);
    assert.equal(isValidHour(20), true);
    assert.equal(isValidHour(21), false);
    assert.equal(isValidHour(6), false);
    assert.equal(isValidHour('10'), false);
    assert.equal(isValidHour(10.5), false);
  });
});

describe('isBlockElapsed', () => {
  test('past date: elapsed', () => {
    assert.equal(isBlockElapsed('2026-05-22', 10, '2026-05-23', '12:00'), true);
  });
  test('future date: not elapsed', () => {
    assert.equal(isBlockElapsed('2026-05-25', 10, '2026-05-23', '12:00'), false);
  });
  test('today, in-progress block: not elapsed', () => {
    assert.equal(isBlockElapsed('2026-05-23', 14, '2026-05-23', '14:30'), false);
  });
  test('today, at block end: elapsed', () => {
    assert.equal(isBlockElapsed('2026-05-23', 14, '2026-05-23', '15:00'), true);
  });
  test('today, after block end: elapsed', () => {
    assert.equal(isBlockElapsed('2026-05-23', 7, '2026-05-23', '09:00'), true);
  });
});

describe('isCountedDay', () => {
  test('past date counts', () => {
    assert.equal(isCountedDay('2026-05-22', '2026-05-23', '12:00'), true);
  });
  test('future date does not count', () => {
    assert.equal(isCountedDay('2026-05-25', '2026-05-23', '12:00'), false);
  });
  test('today before 21:30 does not count', () => {
    assert.equal(isCountedDay('2026-05-23', '2026-05-23', '21:29'), false);
  });
  test('today at 21:30 counts', () => {
    assert.equal(isCountedDay('2026-05-23', '2026-05-23', '21:30'), true);
  });
});

describe('canToggleStar', () => {
  test('today, before 21:30: ok', () => {
    assert.equal(canToggleStar('2026-05-23', '2026-05-23', '12:00').ok, true);
  });
  test('today at 21:30: star_locked', () => {
    const r = canToggleStar('2026-05-23', '2026-05-23', '21:30');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'star_locked');
  });
  test('past date: star_not_today', () => {
    const r = canToggleStar('2026-05-22', '2026-05-23', '12:00');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'star_not_today');
  });
  test('future date: star_not_today', () => {
    const r = canToggleStar('2026-05-25', '2026-05-23', '12:00');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'star_not_today');
  });
});

test('STAR_LOCK_HHMM constant is 21:30', () => {
  assert.equal(STAR_LOCK_HHMM, '21:30');
});

// ── Feature 002 (Recurring agenda items) ─────────────────────────────────────

describe('addDays', () => {
  test('positive offset within a month', () => {
    assert.equal(addDays('2026-06-07', 1), '2026-06-08');
    assert.equal(addDays('2026-06-07', 3), '2026-06-10');
  });
  test('zero offset returns the same date', () => {
    assert.equal(addDays('2026-06-07', 0), '2026-06-07');
  });
  test('crosses a month boundary', () => {
    assert.equal(addDays('2026-06-30', 1), '2026-07-01');
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  });
  test('crosses a year boundary', () => {
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  });
  test('handles a leap-year February (2028)', () => {
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2028-02-29', 1), '2028-03-01');
  });
  test('handles a non-leap-year February (2026)', () => {
    assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  });
  test('large offsets within a year (90 days)', () => {
    assert.equal(addDays('2026-06-07', 90), '2026-09-05');
  });
});

describe('enumerateDailyDates', () => {
  test('produces (source, until] inclusive of until', () => {
    assert.deepEqual(
      enumerateDailyDates('2026-06-07', '2026-06-10'),
      ['2026-06-08', '2026-06-09', '2026-06-10'],
    );
  });
  test('one-day range', () => {
    assert.deepEqual(
      enumerateDailyDates('2026-06-07', '2026-06-08'),
      ['2026-06-08'],
    );
  });
  test('until equals source returns empty array', () => {
    assert.deepEqual(enumerateDailyDates('2026-06-07', '2026-06-07'), []);
  });
  test('crosses a month boundary', () => {
    assert.deepEqual(
      enumerateDailyDates('2026-06-29', '2026-07-02'),
      ['2026-06-30', '2026-07-01', '2026-07-02'],
    );
  });
});

describe('enumerateMatchingWeekdays', () => {
  // 2026-06-07 is a Sunday (per spec US1 AC1).
  test('Sunday source → following 3 Sundays through inclusive until', () => {
    assert.deepEqual(
      enumerateMatchingWeekdays('2026-06-07', '2026-06-28'),
      ['2026-06-14', '2026-06-21', '2026-06-28'],
    );
  });
  test('one matching weekday when until lands exactly on it', () => {
    assert.deepEqual(
      enumerateMatchingWeekdays('2026-06-07', '2026-06-14'),
      ['2026-06-14'],
    );
  });
  test('zero output when until is before next matching weekday (NOT an error)', () => {
    assert.deepEqual(enumerateMatchingWeekdays('2026-06-07', '2026-06-13'), []);
  });
  test('until equals source returns empty array', () => {
    assert.deepEqual(enumerateMatchingWeekdays('2026-06-07', '2026-06-07'), []);
  });
  test('crosses a month boundary', () => {
    // 2026-06-30 is a Tuesday; matching weekdays through 2026-07-21 → Jul 7, 14, 21.
    assert.deepEqual(
      enumerateMatchingWeekdays('2026-06-30', '2026-07-21'),
      ['2026-07-07', '2026-07-14', '2026-07-21'],
    );
  });
});

describe('capUntil', () => {
  test('default 90-day cap', () => {
    assert.equal(capUntil('2026-06-07'), '2026-09-05');
  });
  test('explicit days parameter', () => {
    assert.equal(capUntil('2026-06-07', 7), '2026-06-14');
    assert.equal(capUntil('2026-06-07', 30), '2026-07-07');
  });
  test('crosses a year boundary', () => {
    assert.equal(capUntil('2026-12-15', 90), '2027-03-15');
  });
});
