const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

class Store {
  constructor(filePath) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        initial_balance_cents INTEGER NOT NULL,
        balance_cents INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id),
        kind TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions(account_id);
    `);
  }

  close() { this.db.close(); }
  id() { return crypto.randomUUID(); }
  listAccounts() { return this.db.prepare(`${accountColumns} FROM accounts ORDER BY created_at DESC`).all(); }
  account(id) {
    if (typeof id !== 'string') return undefined;
    return this.db.prepare(`${accountColumns} FROM accounts WHERE id = ?`).get(id);
  }
  listTransactions(accountId) {
    const query = `${transactionColumns} FROM transactions${accountId ? ' WHERE account_id = ?' : ''} ORDER BY date DESC, created_at DESC`;
    return accountId ? this.db.prepare(query).all(accountId) : this.db.prepare(query).all();
  }
  createAccount({ name, type, initialBalanceCents }) {
    const account = { id: this.id(), name, type, initialBalanceCents, balanceCents: initialBalanceCents, createdAt: new Date().toISOString() };
    this.db.prepare('INSERT INTO accounts (id, name, type, initial_balance_cents, balance_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(account.id, account.name, account.type, account.initialBalanceCents, account.balanceCents, account.createdAt);
    return account;
  }
  createTransaction({ accountId, kind, amountCents, date, category, description }) {
    const transaction = { id: this.id(), accountId, kind, amountCents, date, category, description, createdAt: new Date().toISOString() };
    const balanceChange = kind === 'income' ? amountCents : -amountCents;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const update = this.db.prepare('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?').run(balanceChange, accountId);
      if (update.changes !== 1) throw new Error('Account not found');
      this.db.prepare('INSERT INTO transactions (id, account_id, kind, amount_cents, date, category, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(transaction.id, transaction.accountId, transaction.kind, transaction.amountCents, transaction.date, transaction.category, transaction.description, transaction.createdAt);
      this.db.exec('COMMIT');
      return transaction;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  deleteTransaction(id) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const transaction = this.db.prepare(`${transactionColumns} FROM transactions WHERE id = ?`).get(id);
      if (!transaction) { this.db.exec('COMMIT'); return null; }
      const balanceChange = transaction.kind === 'income' ? -transaction.amountCents : transaction.amountCents;
      this.db.prepare('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?').run(balanceChange, transaction.accountId);
      this.db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
      this.db.exec('COMMIT');
      return transaction;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}

const accountColumns = 'SELECT id, name, type, initial_balance_cents AS initialBalanceCents, balance_cents AS balanceCents, created_at AS createdAt';
const transactionColumns = 'SELECT id, account_id AS accountId, kind, amount_cents AS amountCents, date, category, description, created_at AS createdAt';
module.exports = { Store };
