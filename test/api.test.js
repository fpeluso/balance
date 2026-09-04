const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');
const { createApp } = require('../src/app');
let server; let base; let file; let store;
test.before(async () => { file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'finance-')), 'finance.db'); store = new Store(file); server = http.createServer(createApp(store)); await new Promise((resolve) => server.listen(0, resolve)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(async () => { await new Promise((resolve) => server.close(resolve)); store.close(); fs.rmSync(path.dirname(file), { recursive: true, force: true }); });
async function request(method, route, body) { const result = await fetch(base + route, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) }); return { status: result.status, body: result.status === 204 ? null : await result.json() }; }
test('transactions require an account and update then reverse its balance', async () => {
  const rejected = await request('POST', '/transactions', { kind: 'expense', amount: '10.00', date: '2026-09-04', category: 'Food' }); assert.equal(rejected.status, 422);
  const created = await request('POST', '/accounts', { name: 'Visa', type: 'credit_card', initialBalance: '100.00' }); assert.equal(created.status, 201); assert.equal(created.body.balance, '100.00');
  const transaction = await request('POST', '/transactions', { accountId: created.body.id, kind: 'expense', amount: '24.90', date: '2026-09-04', category: 'Food' }); assert.equal(transaction.status, 201);
  let account = await request('GET', `/accounts/${created.body.id}`); assert.equal(account.body.balance, '75.10');
  assert.equal((await request('DELETE', `/transactions/${transaction.body.id}`)).status, 204); account = await request('GET', `/accounts/${created.body.id}`); assert.equal(account.body.balance, '100.00');
});

test('SQLite data survives reopening the database', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-persistence-'));
  const database = path.join(directory, 'finance.db');
  let store = new Store(database);
  const account = store.createAccount({ name: 'Savings', type: 'savings', initialBalanceCents: 1000 });
  store.createTransaction({ accountId: account.id, kind: 'income', amountCents: 250, date: '2026-09-04', category: 'Interest', description: '' });
  store.close();
  store = new Store(database);
  assert.equal(store.account(account.id).balanceCents, 1250);
  assert.equal(store.listTransactions(account.id).length, 1);
  store.close();
  fs.rmSync(directory, { recursive: true, force: true });
});
