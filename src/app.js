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
      if (request.method === 'GET' && url.pathname === '/accounts') return send(response, 200, store.listAccounts().map(serializeAccount));
      if (request.method === 'POST' && url.pathname === '/accounts') {
        const body = await bodyJson(request), initialBalanceCents = parseMoney(body.initialBalance ?? '0');
        if (!validName(body.name) || !ACCOUNT_TYPES.has(body.type) || initialBalanceCents === null) return send(response, 422, { error: 'name, a valid type, and a valid initialBalance are required' });
        const account = store.createAccount({ name: body.name.trim(), type: body.type, initialBalanceCents });
        return send(response, 201, serializeAccount(account));
      }
      if (parts[0] === 'accounts' && parts.length === 2 && request.method === 'GET') { const account = store.account(parts[1]); return account ? send(response, 200, serializeAccount(account)) : notFound(response, 'Account'); }
      if (request.method === 'GET' && url.pathname === '/transactions') return send(response, 200, store.listTransactions(url.searchParams.get('accountId')).map(serializeTransaction));
      if (request.method === 'POST' && url.pathname === '/transactions') {
        const body = await bodyJson(request), amountCents = parseMoney(body.amount), account = store.account(body.accountId);
        if (!account) return send(response, 422, { error: 'accountId must identify an existing account or credit card' });
        if (!TRANSACTION_KINDS.has(body.kind) || amountCents === null || amountCents <= 0 || !validDate(body.date) || !validName(body.category)) return send(response, 422, { error: 'kind, a positive amount, ISO date, and category are required' });
        const transaction = store.createTransaction({ accountId: account.id, kind: body.kind, amountCents, date: body.date, category: body.category.trim(), description: typeof body.description === 'string' ? body.description.trim() : '' });
        return send(response, 201, serializeTransaction(transaction));
      }
      if (parts[0] === 'transactions' && parts.length === 2 && request.method === 'DELETE') {
        const transaction = store.deleteTransaction(parts[1]); if (!transaction) return notFound(response, 'Transaction'); response.writeHead(204); return response.end();
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
