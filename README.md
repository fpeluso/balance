# Personal Finance API

A dependency-free Node.js REST backend for tracking current accounts and credit cards. Monetary values are accepted and returned as decimal strings (for example, `"12.50"`) so balances are never calculated using floating point values.

## Run

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

Data is stored locally in `data/finance.json` and written through a temporary file followed by an atomic rename. Do not commit this file.
