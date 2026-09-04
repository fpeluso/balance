# Personal Finance API

A dependency-free Node.js REST backend for tracking current accounts and credit cards. Data is persisted in a SQLite database, while monetary values are accepted and returned as decimal strings (for example, `"12.50"`) so balances are never calculated using floating point values.

## Run with Docker (recommended)

The included Docker configuration is intentionally lightweight for a home server. It uses the `linux/amd64` image selected automatically by Docker on an Intel/AMD Debian host, runs the API as an unprivileged user, restarts it after a reboot, and keeps financial data in the `finance-data` named volume.

1. Install Docker Engine and the Docker Compose plugin on the Debian host.
2. From the repository directory, build and start the service:

   ```bash
   docker compose up -d --build
   ```

3. Verify that the container is healthy and call the API from the host:

   ```bash
   docker compose ps
   curl http://localhost:3000/health
   ```

The API is available on TCP port `3000`. To publish a different host port, start it with `HOST_PORT=8080 docker compose up -d`. Docker retains data across container rebuilds in its named volume; back it up with:

```bash
docker run --rm -v personal-finance-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/finance-data-backup.tar.gz -C /data .
```

To stop the API without deleting its data, use `docker compose down`. Do **not** use `docker compose down -v` unless you intentionally want to erase all stored financial data.

## Run without Docker

```bash
npm start
```

The API listens on `http://localhost:3000` by default. Set `PORT` or `DATA_FILE` to override the port or the JSON data-file location.

## API

### Accounts and cards

`POST /accounts` creates an account or a credit card:

```json
{ "name": "Main account", "type": "checking", "initialBalance": "1250.00" }
```

Allowed types are `checking`, `savings`, and `credit_card`. The endpoint returns the account including its current `balance`. Use `GET /accounts` to list accounts and `GET /accounts/:id` to retrieve one.

### Transactions

`POST /transactions` creates an income or expense and atomically updates the linked account balance:

```json
{
  "accountId": "<account id>",
  "kind": "expense",
  "amount": "24.90",
  "date": "2026-09-04",
  "category": "Groceries",
  "description": "Weekly shop"
}
```

`accountId`, `kind`, `amount`, `date`, and `category` are required. `kind` is either `income` or `expense`; income increases the balance and expense decreases it. Use `GET /transactions` (optionally `?accountId=...`) to list transactions. Deleting a transaction with `DELETE /transactions/:id` reverses its effect on the account balance.

## Persistence

Data is stored locally in the SQLite database `data/finance.db`. SQLite keeps the application self-contained—no separate database server is required—and each transaction creation or deletion updates both the transaction ledger and the linked account balance inside one database transaction. Do not commit the database files.
