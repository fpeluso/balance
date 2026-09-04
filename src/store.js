const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
class Store {
  constructor(filePath) { this.filePath = filePath; this.data = { accounts: [], transactions: [] }; }
  load() { if (!fs.existsSync(this.filePath)) return; const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')); if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.transactions)) throw new Error('Invalid data file'); this.data = parsed; }
  save() { fs.mkdirSync(path.dirname(this.filePath), { recursive: true }); const temporary = `${this.filePath}.tmp`; fs.writeFileSync(temporary, JSON.stringify(this.data, null, 2) + '\n'); fs.renameSync(temporary, this.filePath); }
  id() { return crypto.randomUUID(); }
  account(id) { return this.data.accounts.find((item) => item.id === id); }
  transaction(id) { return this.data.transactions.find((item) => item.id === id); }
}
module.exports = { Store };
