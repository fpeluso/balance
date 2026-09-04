const { parseMoney, formatMoney } = require('./money');
const ACCOUNT_TYPES = new Set(['checking', 'savings', 'credit_card']);
const TRANSACTION_KINDS = new Set(['income', 'expense']);
function serializeAccount(account) { return { ...account, balance: formatMoney(account.balanceCents), initialBalance: formatMoney(account.initialBalanceCents), balanceCents: undefined, initialBalanceCents: undefined }; }
function serializeTransaction(transaction) { return { ...transaction, amount: formatMoney(transaction.amountCents), amountCents: undefined }; }
function createApp(store) {
  return async function handler(request, response) {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`), parts = url.pathname.split('/').filter(Boolean);
      if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { status: 'ok' });
      if (request.method === 'GET' && url.pathname === '/accounts') return send(response, 200, store.data.accounts.map(serializeAccount));
      if (request.method === 'POST' && url.pathname === '/accounts') {
        const body = await bodyJson(request), initialBalanceCents = parseMoney(body.initialBalance ?? '0');
        if (!validName(body.name) || !ACCOUNT_TYPES.has(body.type) || initialBalanceCents === null) return send(response, 422, { error: 'name, a valid type, and a valid initialBalance are required' });
        const account = { id: store.id(), name: body.name.trim(), type: body.type, initialBalanceCents, balanceCents: initialBalanceCents, createdAt: new Date().toISOString() };
        store.data.accounts.push(account); store.save(); return send(response, 201, serializeAccount(account));
      }
      if (parts[0] === 'accounts' && parts.length === 2 && request.method === 'GET') { const account = store.account(parts[1]); return account ? send(response, 200, serializeAccount(account)) : notFound(response, 'Account'); }
      if (request.method === 'GET' && url.pathname === '/transactions') { const accountId = url.searchParams.get('accountId'), transactions = accountId ? store.data.transactions.filter((item) => item.accountId === accountId) : store.data.transactions; return send(response, 200, transactions.map(serializeTransaction)); }
      if (request.method === 'POST' && url.pathname === '/transactions') {
        const body = await bodyJson(request), amountCents = parseMoney(body.amount), account = store.account(body.accountId);
        if (!account) return send(response, 422, { error: 'accountId must identify an existing account or credit card' });
        if (!TRANSACTION_KINDS.has(body.kind) || amountCents === null || amountCents <= 0 || !validDate(body.date) || !validName(body.category)) return send(response, 422, { error: 'kind, a positive amount, ISO date, and category are required' });
        const transaction = { id: store.id(), accountId: account.id, kind: body.kind, amountCents, date: body.date, category: body.category.trim(), description: typeof body.description === 'string' ? body.description.trim() : '', createdAt: new Date().toISOString() };
        account.balanceCents += body.kind === 'income' ? amountCents : -amountCents; store.data.transactions.push(transaction); store.save(); return send(response, 201, serializeTransaction(transaction));
      }
      if (parts[0] === 'transactions' && parts.length === 2 && request.method === 'DELETE') {
        const transaction = store.transaction(parts[1]); if (!transaction) return notFound(response, 'Transaction'); const account = store.account(transaction.accountId);
        if (account) account.balanceCents += transaction.kind === 'income' ? -transaction.amountCents : transaction.amountCents;
        store.data.transactions = store.data.transactions.filter((item) => item.id !== transaction.id); store.save(); response.writeHead(204); return response.end();
      }
      return notFound(response, 'Route');
    } catch (error) { if (error instanceof SyntaxError) return send(response, 400, { error: 'Request body must be valid JSON' }); return send(response, 500, { error: 'Internal server error' }); }
  };
}
function validName(value) { return typeof value === 'string' && value.trim().length > 0; }
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function notFound(response, resource) { return send(response, 404, { error: `${resource} not found` }); }
function send(response, status, payload) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(payload)); }
function bodyJson(request) { return new Promise((resolve, reject) => { let raw = ''; request.on('data', (chunk) => { raw += chunk; if (raw.length > 1_000_000) request.destroy(); }); request.on('end', () => resolve(raw ? JSON.parse(raw) : {})); request.on('error', reject); }); }
module.exports = { createApp };
