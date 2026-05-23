import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from '../../src/lib/hash.js';

describe('createHash', () => {
  test('throws if secret is empty/null', () => {
    assert.throws(() => createHash(''));
    assert.throws(() => createHash(null));
  });

  test('returns deterministic HMAC for identical input', () => {
    const h = createHash('s1');
    assert.equal(h('abc'), h('abc'));
    assert.notEqual(h('abc'), h('abd'));
  });

  test('different secrets produce different hashes', () => {
    assert.notEqual(createHash('s1')('abc'), createHash('s2')('abc'));
  });

  test('normalizes input — trims whitespace and lowercases', () => {
    const h = createHash('s');
    assert.equal(h('Hello'), h(' hello '));
    assert.equal(h('OAK PARK'), h('oak park'));
  });

  test('null/undefined input returns null', () => {
    const h = createHash('s');
    assert.equal(h(null), null);
    assert.equal(h(undefined), null);
  });

  test('output is 64-char hex (SHA-256)', () => {
    const h = createHash('s');
    assert.match(h('x'), /^[a-f0-9]{64}$/);
  });
});
