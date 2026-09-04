const http = require('node:http');
const path = require('node:path');
const { Store } = require('./store');
const { createApp } = require('./app');
const store = new Store(process.env.DATA_FILE || path.join(process.cwd(), 'data', 'finance.json'));
store.load();
const port = Number(process.env.PORT || 3000);
http.createServer(createApp(store)).listen(port, () => console.log(`Personal Finance API listening on port ${port}`));
