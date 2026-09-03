# API Documentation

Base URL: `http://localhost:8000`

All protected endpoints require an `Authorization: Bearer <access_token>` header.

---

## Health

| Method | Endpoint             | Auth | Description                  |
| ------ | -------------------- | ---- | ---------------------------- |
| GET    | `/health`            | No   | Basic health check           |
| GET    | `/api/v1/health`     | No   | API health status            |
| GET    | `/api/v1/health/ready` | No | Readiness probe (checks DB) |
| GET    | `/api/v1/health/live`  | No | Liveness probe              |

---

## Authentication

| Method | Endpoint              | Auth | Description                    |
| ------ | --------------------- | ---- | ------------------------------ |
| POST   | `/api/v1/auth/signup` | No   | Register a new user            |
| POST   | `/api/v1/auth/login`  | No   | Login and get JWT tokens       |
| POST   | `/api/v1/auth/refresh`| No   | Refresh an expired token       |
| POST   | `/api/v1/auth/logout` | Yes  | Sign out and revoke session    |
| GET    | `/api/v1/auth/me`     | Yes  | Get current user info          |

### Signup

```json
POST /api/v1/auth/signup
{
  "email": "user@example.com",
  "password": "securepass123",
  "full_name": "Jane Doe"
}
```

Response `201`:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "message": "Signup successful"
}
```

### Login

```json
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

Response `200`:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Refresh Token

```json
POST /api/v1/auth/refresh
{
  "refresh_token": "eyJ..."
}
```

Response `200`: Same shape as login response.

---

## Users

| Method | Endpoint              | Auth | Description              |
| ------ | --------------------- | ---- | ------------------------ |
| GET    | `/api/v1/users/me`    | Yes  | Get profile              |
| PUT    | `/api/v1/users/me`    | Yes  | Update profile           |
| DELETE | `/api/v1/users/me`    | Yes  | Delete account           |

### Update Profile

```json
PUT /api/v1/users/me
{
  "full_name": "Jane Smith",
  "avatar_url": "https://example.com/avatar.png",
  "phone": "+1234567890"
}
```

---

## Chats

| Method | Endpoint                       | Auth | Description              |
| ------ | ------------------------------ | ---- | ------------------------ |
| GET    | `/api/v1/chats`                | Yes  | List all chats           |
| POST   | `/api/v1/chats`                | Yes  | Create a new chat        |
| GET    | `/api/v1/chats/{chat_id}`      | Yes  | Get a single chat        |
| PUT    | `/api/v1/chats/{chat_id}`      | Yes  | Update chat title/pin    |
| DELETE | `/api/v1/chats/{chat_id}`      | Yes  | Delete a chat            |
| GET    | `/api/v1/chats/{chat_id}/messages` | Yes | Get chat messages    |
| POST   | `/api/v1/chats/{chat_id}/messages` | Yes | Send message (SSE stream)|

### Create Chat

```json
POST /api/v1/chats
{
  "title": "Portfolio Analysis"
}
```

### Send Message (Server-Sent Events)

```json
POST /api/v1/chats/{chat_id}/messages
{
  "content": "What are the risks in my portfolio?"
}
```

Response is an SSE stream. Each `data` payload:

```json
{"type": "token", "token": "Based on your holdings..."}
{"type": "citations", "citations": [{"source": "document.pdf", "page": 3}]}
{"type": "done", "message_id": "uuid"}
```

---

## Documents

| Method | Endpoint                          | Auth | Description              |
| ------ | --------------------------------- | ---- | ------------------------ |
| GET    | `/api/v1/documents`               | Yes  | List all documents       |
| POST   | `/api/v1/documents/upload`        | Yes  | Upload a document        |
| GET    | `/api/v1/documents/{document_id}` | Yes  | Get document metadata    |
| DELETE | `/api/v1/documents/{document_id}` | Yes  | Delete a document        |
| POST   | `/api/v1/documents/{document_id}/ask` | Yes | Ask a question about doc|

### Upload Document

```
POST /api/v1/documents/upload
Content-Type: multipart/form-data

file: <binary file data>
```

Accepted formats: `.pdf`, `.docx`, `.csv`, `.xlsx`, `.xls`. Max size: 50 MB.

### Ask About Document

```json
POST /api/v1/documents/{document_id}/ask
{
  "question": "What is the total revenue for Q3?"
}
```

Response:
```json
{
  "answer": "The total revenue for Q3 was $42.3 billion...",
  "citations": [{"source": "Q3_report.pdf", "page": 12, "text": "..."}]
}
```

---

## Portfolio

| Method | Endpoint                           | Auth | Description              |
| ------ | ---------------------------------- | ---- | ------------------------ |
| GET    | `/api/v1/portfolio/assets`         | Yes  | List portfolio assets    |
| POST   | `/api/v1/portfolio/assets`         | Yes  | Add an asset             |
| PUT    | `/api/v1/portfolio/assets/{id}`    | Yes  | Update an asset          |
| DELETE | `/api/v1/portfolio/assets/{id}`    | Yes  | Remove an asset          |
| GET    | `/api/v1/portfolio/transactions`   | Yes  | List transactions        |
| POST   | `/api/v1/portfolio/transactions`   | Yes  | Record a transaction     |
| GET    | `/api/v1/portfolio/summary`        | Yes  | Portfolio summary        |

### Add Asset

```json
POST /api/v1/portfolio/assets
{
  "ticker": "AAPL",
  "name": "Apple Inc.",
  "asset_type": "stock",
  "quantity": 10,
  "avg_cost_per_unit": 175.50,
  "currency": "USD"
}
```

### Record Transaction

```json
POST /api/v1/portfolio/transactions
{
  "asset_id": "uuid",
  "transaction_type": "buy",
  "quantity": 5,
  "price_per_unit": 180.00,
  "fees": 1.50,
  "notes": "Additional purchase"
}
```

### Portfolio Summary

Response `200`:
```json
{
  "total_market_value": 45230.50,
  "total_cost_basis": 42000.00,
  "total_gain_loss": 3230.50,
  "total_gain_loss_pct": 7.69,
  "asset_count": 5,
  "currency": "USD",
  "allocation": [
    {"ticker": "AAPL", "market_value": 18000, "weight": 39.8},
    {"ticker": "MSFT", "market_value": 12000, "weight": 26.5}
  ]
}
```

---

## Watchlist

| Method | Endpoint                       | Auth | Description              |
| ------ | ------------------------------ | ---- | ------------------------ |
| GET    | `/api/v1/watchlist`            | Yes  | Get watchlist            |
| POST   | `/api/v1/watchlist`            | Yes  | Add ticker to watchlist  |
| DELETE | `/api/v1/watchlist/{item_id}`  | Yes  | Remove from watchlist    |

### Add to Watchlist

```json
POST /api/v1/watchlist
{
  "ticker": "TSLA",
  "label": "EV sector"
}
```

---

## Companies

| Method | Endpoint                           | Auth | Description                  |
| ------ | ---------------------------------- | ---- | ---------------------------- |
| GET    | `/api/v1/companies/search?q=...`   | No   | Search companies             |
| GET    | `/api/v1/companies/{ticker}/overview` | No | Company overview          |
| GET    | `/api/v1/companies/{ticker}/financials` | No | Financial statements    |
| GET    | `/api/v1/companies/{ticker}/earnings` | No | Earnings data            |
| GET    | `/api/v1/companies/{ticker}/peers` | No   | Peer companies               |

---

## News

| Method | Endpoint                      | Auth | Description              |
| ------ | ----------------------------- | ---- | ------------------------ |
| GET    | `/api/v1/news`                | No   | List financial news      |
| GET    | `/api/v1/news/{ticker}`       | No   | News for a specific ticker|

### Query Parameters

| Param       | Type   | Description                         |
| ----------- | ------ | ----------------------------------- |
| `ticker`    | string | Filter by ticker symbol             |
| `sentiment` | string | Filter: `positive`, `negative`, `neutral` |
| `start_date`| string | Start date `YYYY-MM-DD`             |
| `end_date`  | string | End date `YYYY-MM-DD`               |
| `limit`     | int    | Max results (1-100, default 20)     |

---

## Settings

| Method | Endpoint                | Auth | Description              |
| ------ | ----------------------- | ---- | ------------------------ |
| GET    | `/api/v1/settings`      | Yes  | Get user settings        |
| PUT    | `/api/v1/settings`      | Yes  | Update user settings     |

### Update Settings

```json
PUT /api/v1/settings
{
  "theme": "dark",
  "default_currency": "EUR",
  "language": "en",
  "weekly_report_enabled": true,
  "price_alerts_enabled": false,
  "notification_email": "user@example.com",
  "timezone": "America/New_York"
}
```

---

## Error Codes

| Code | Meaning                  |
| ---- | ------------------------ |
| 400  | Bad Request              |
| 401  | Unauthorized             |
| 403  | Forbidden                |
| 404  | Resource Not Found       |
| 409  | Conflict (e.g. duplicate)|
| 413  | File Too Large           |
| 422  | Validation Error         |
| 429  | Rate Limit Exceeded      |
| 500  | Internal Server Error    |
| 502  | Bad Gateway              |
| 503  | Service Unavailable      |

All error responses follow the shape:
```json
{
  "detail": "Human-readable error message"
}
```
