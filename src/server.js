const http = require('node:http');
const path = require('node:path');
const { Store } = require('./store');
const { createApp } = require('./app');
const store = new Store(process.env.DATA_FILE || path.join(process.cwd(), 'data', 'finance.db'));
const port = Number(process.env.PORT || 3000);
const server = http.createServer(createApp(store));
server.listen(port, () => console.log(`Personal Finance API listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
}
