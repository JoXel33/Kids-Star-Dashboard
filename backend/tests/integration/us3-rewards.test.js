import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDb, applySchema } from '../../src/db/index.js';
import { createApp } from '../../src/app.js';

async function setupWithStars(starCount) {
  const db = openDb(':memory:');
  applySchema(db);
  const app = createApp(db, { serverSecret: 'us3' });
  const setup = await request(app).post('/api/children')
    .send({ name: 'Mia', accessCode: 'mer', recoveryAnswer: 'oak', createdDate: '2026-05-15' });
  const auth = { Authorization: `Bearer ${setup.body.sessionToken}` };
  for (let i = 0; i < starCount; i++) {
    const dt = new Date(Date.UTC(2026, 4, 15 + i));
    const date = dt.toISOString().slice(0, 10);
    await request(app).put(`/api/days/${date}/star`).set(auth)
      .send({ earned: true, clientDate: date, clientTime: '20:00' });
  }
  return { app, auth };
}

describe('US3 — maintain and redeem rewards', () => {
  test('add up to 3 wants; 4th rejected', async () => {
    const { app, auth } = await setupWithStars(0);
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/wants').set(auth)
        .send({ description: `w${i}`, cost: 1 }).expect(201);
    }
    const fourth = await request(app).post('/api/wants').set(auth)
      .send({ description: '4th', cost: 1 });
    assert.equal(fourth.status, 422);
    assert.equal(fourth.body.error.code, 'want_limit_reached');
  });

  test('redeem succeeds when balance sufficient; want removed; wallet updates', async () => {
    const { app, auth } = await setupWithStars(5);
    const add = await request(app).post('/api/wants').set(auth)
      .send({ description: 'Ice cream', cost: 3 });
    const id = add.body.want.id;
    const r = await request(app).post(`/api/wants/${id}/redeem`).set(auth)
      .send({ clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(r.status, 200);
    assert.equal(r.body.wallet.starsSpent, 3);
    assert.equal(r.body.wallet.starBalance, 2);
    const list = await request(app).get('/api/wants').set(auth).expect(200);
    assert.equal(list.body.wants.length, 0);
  });

  test('redeem rejected when insufficient balance; want unchanged', async () => {
    const { app, auth } = await setupWithStars(2);
    const add = await request(app).post('/api/wants').set(auth)
      .send({ description: 'pricey', cost: 5 });
    const id = add.body.want.id;
    const r = await request(app).post(`/api/wants/${id}/redeem`).set(auth)
      .send({ clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(r.status, 422);
    assert.equal(r.body.error.code, 'insufficient_balance');
    const list = await request(app).get('/api/wants').set(auth);
    assert.equal(list.body.wants.length, 1);
  });

  test('non-redeemed want can be removed', async () => {
    const { app, auth } = await setupWithStars(0);
    const add = await request(app).post('/api/wants').set(auth)
      .send({ description: 'go', cost: 2 });
    const del = await request(app).delete(`/api/wants/${add.body.want.id}`).set(auth);
    assert.equal(del.status, 204);
  });

  test('balance can never go negative — second redeem rejected', async () => {
    const { app, auth } = await setupWithStars(3);
    const a = await request(app).post('/api/wants').set(auth).send({ description: 'a', cost: 3 });
    const b = await request(app).post('/api/wants').set(auth).send({ description: 'b', cost: 3 });
    const r1 = await request(app).post(`/api/wants/${a.body.want.id}/redeem`).set(auth)
      .send({ clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.wallet.starBalance, 0);
    const r2 = await request(app).post(`/api/wants/${b.body.want.id}/redeem`).set(auth)
      .send({ clientDate: '2026-05-23', clientTime: '12:00' });
    assert.equal(r2.status, 422);
    assert.equal(r2.body.error.code, 'insufficient_balance');
  });
});
