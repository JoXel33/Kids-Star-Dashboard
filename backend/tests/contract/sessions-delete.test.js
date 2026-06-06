import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

function makeApp() {
  const db = openDb(':memory:');
  applySchema(db);
  const app = createApp(db, { serverSecret: 'test-secret' });
  return { app, db };
}

const today = '2026-05-23';

async function withChild() {
  const { app } = makeApp();
  const res = await request(app)
    .post('/api/children')
    .send({ name: 'Mia', accessCode: 'bluefish', recoveryAnswer: 'Oak Park', createdDate: today });
  return { app, token: res.body.sessionToken };
}

describe('DELETE /api/sessions — logout', () => {
  test('204 invalidates the current session token', async () => {
    const { app, token } = await withChild();
    const del = await request(app).delete('/api/sessions').set('Authorization', `Bearer ${token}`);
    assert.equal(del.status, 204);
    const me = await request(app).get('/api/children/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 401);
  });

  test('401 without a token', async () => {
    const { app } = await withChild();
    const res = await request(app).delete('/api/sessions');
    assert.equal(res.status, 401);
  });

  test('does not affect other live sessions for the same child', async () => {
    const { app, token: tokenA } = await withChild();
    const loginB = await request(app).post('/api/sessions').send({ accessCode: 'bluefish' });
    const tokenB = loginB.body.sessionToken;
    assert.notEqual(tokenA, tokenB);

    const del = await request(app).delete('/api/sessions').set('Authorization', `Bearer ${tokenA}`);
    assert.equal(del.status, 204);

    const meA = await request(app).get('/api/children/me').set('Authorization', `Bearer ${tokenA}`);
    assert.equal(meA.status, 401);
    const meB = await request(app).get('/api/children/me').set('Authorization', `Bearer ${tokenB}`);
    assert.equal(meB.status, 200);
  });
});
