import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidDate, isValidTime, isValidHour,
  isBlockElapsed, isCountedDay, canToggleStar,
  STAR_LOCK_HHMM,
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
