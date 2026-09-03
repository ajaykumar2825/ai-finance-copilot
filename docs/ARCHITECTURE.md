# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 15 Frontend                       │   │
│  │                                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │  Auth     │ │ Portfolio│ │  Chat    │ │  Documents   │   │   │
│  │  │  Store   │ │  Store   │ │  Store   │ │  Service     │   │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │   │
│  │       │             │            │               │           │   │
│  │  ┌────┴─────────────┴────────────┴───────────────┴───────┐   │   │
│  │  │              API Client (services/api.ts)              │   │   │
│  │  └───────────────────────┬───────────────────────────────┘   │   │
│  └──────────────────────────┼───────────────────────────────────┘   │
│                             │ HTTPS                                 │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      REVERSE PROXY / CDN                            │
│                                                                     │
│              Vercel (Frontend) / Render (Backend)                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Middleware Chain                                            │   │
│  │  ┌───────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │   CORS    │→ │  Rate Limit  │→ │  SupabaseJWT Auth    │  │   │
│  │  └───────────┘  └──────────────┘  └──────────────────────┘  │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────┴───────────────────────────────────┐   │
│  │                     API Router (v1)                          │   │
│  │                                                              │   │
│  │  /auth  /users  /chats  /documents  /portfolio               │   │
│  │  /companies  /news  /watchlist  /settings                    │   │
│  └──────┬──────────────┬───────────────┬────────────────────────┘   │
│         │              │               │                            │
│    ┌────┴────┐   ┌─────┴─────┐  ┌─────┴─────┐                     │
│    │  Auth   │   │   RAG     │  │  Market   │                     │
│    │ Service │   │  Engine   │  │  Data     │                     │
│    │(Supabase│   │(LangChain)│  │(yfinance) │                     │
│    └────┬────┘   └─────┬─────┘  └───────────┘                     │
│         │              │                                           │
└─────────┼──────────────┼───────────────────────────────────────────┘
          │              │
          ▼              ▼
┌──────────────────┐  ┌──────────────────────────────────────────────┐
│  Supabase Auth   │  │              Data Layer                       │
│                  │  │                                               │
│  ┌────────────┐  │  │  ┌────────────────┐  ┌──────────────────┐   │
│  │ JWT Tokens │  │  │  │   PostgreSQL   │  │ Supabase Storage │   │
│  │ Session    │  │  │  │  + pgvector    │  │  (File uploads)  │   │
│  │ Management │  │  │  │                │  │                  │   │
│  └────────────┘  │  │  └────────────────┘  └──────────────────┘   │
└──────────────────┘  └──────────────────────────────────────────────┘
```

## Component Descriptions

### Frontend (Next.js 15)

- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **State Management**: Zustand stores for auth, chat, and UI state
- **Server State**: TanStack Query for data fetching and caching
- **Styling**: Tailwind CSS 4 with Radix UI primitives
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for portfolio visualizations
- **Auth**: Supabase Auth client with SSR support

### Backend (FastAPI)

- **Framework**: FastAPI with async/await throughout
- **Auth**: Supabase Auth with JWT verification middleware
- **Database**: SQLAlchemy 2.0 async with PostgreSQL + pgvector
- **Migrations**: Alembic for schema versioning
- **Rate Limiting**: Custom in-memory rate limiter (100 req/min)
- **File Parsing**: pypdf, python-docx, openpyxl for document processing

### RAG Engine

- **Document Processing**: File parsing → chunking → embedding → storage
- **Embeddings**: OpenAI, Gemini, or local sentence-transformers
- **Vector Store**: pgvector for similarity search
- **LLM Providers**: OpenAI GPT-4o, Gemini, or Anthropic Claude
- **Context Building**: BM25 + vector similarity hybrid retrieval
- **Citations**: Source tracking with page numbers and text snippets

### Database (PostgreSQL 16 + pgvector)

| Table                  | Purpose                              |
| ---------------------- | ------------------------------------ |
| `users`                | User accounts (Supabase Auth sync)  |
| `user_settings`        | Per-user preferences                 |
| `portfolio_assets`     | Investment holdings                  |
| `transactions`         | Buy/sell/dividend history            |
| `watchlist_items`      | Tickers being tracked                |
| `chats`                | Chat sessions                        |
| `messages`             | Chat message history                 |
| `documents`            | Uploaded file metadata               |
| `document_embeddings`  | Vector embeddings (pgvector)         |
| `news_articles`        | Cached news data                     |
| `audit_logs`           | Security audit trail                 |

## Data Flow

### 1. User Authentication

```
Browser → Supabase Auth → JWT Token → Backend Middleware → Request Handler
```

### 2. Portfolio Management

```
User Action → Frontend Store → API Client → Backend Endpoint
  → Database Query → yfinance (live prices) → JSON Response
  → Frontend Re-render
```

### 3. AI Chat (RAG Pipeline)

```
User sends message
  → Frontend POST /api/v1/chats/{id}/messages
  → Backend stores user message
  → Backend builds conversation history from DB
  → RAG Engine:
    1. Embed user query
    2. Vector similarity search (pgvector)
    3. BM25 keyword search
    4. Hybrid reranking
    5. Build context window
    6. Stream LLM response via SSE
  → Backend stores AI response
  → Frontend renders streaming tokens
```

### 4. Document Upload & Indexing

```
User uploads file
  → Backend validates type/size
  → Upload to Supabase Storage
  → Store metadata in documents table
  → Background worker:
    1. Download from storage
    2. Parse content (PDF/DOCX/CSV/XLSX)
    3. Chunk text (LangChain text splitters)
    4. Generate embeddings
    5. Store in pgvector
```

## RAG Pipeline Deep Dive

```
┌─────────────────────────────────────────────────────┐
│                  Query Processing                     │
│                                                       │
│  User Query ──→ Embedding Model ──→ Query Vector      │
│                                                       │
│  ┌──────────────┐     ┌──────────────────────────┐   │
│  │   Vector     │     │       BM25 Keyword       │   │
│  │   Search     │     │        Search            │   │
│  │ (pgvector)   │     │   (rank-bm25 library)    │   │
│  └──────┬───────┘     └────────────┬─────────────┘   │
│         │                          │                  │
│         └──────────┬───────────────┘                  │
│                    ▼                                  │
│         ┌──────────────────┐                          │
│         │ Hybrid Reranking │                          │
│         │ (score fusion)   │                          │
│         └────────┬─────────┘                          │
│                  ▼                                    │
│         ┌──────────────────┐                          │
│         │  Context Builder │ ← Top-K chunks           │
│         │  (token-budget)  │ ← Document metadata      │
│         └────────┬─────────┘                          │
│                  ▼                                    │
│         ┌──────────────────┐                          │
│         │   LLM Provider   │ ← System prompt          │
│         │  (streaming)     │ ← Context + History      │
│         └────────┬─────────┘                          │
│                  ▼                                    │
│           Streamed Response                           │
│           + Citations                                 │
└─────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions CI                     │
│                                                         │
│  lint-and-typecheck → test → build                      │
└────────────────────────────┬────────────────────────────┘
                             │ on push to main
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Deployment Pipeline                   │
│                                                         │
│  ┌─────────────────┐      ┌────────────────────────┐   │
│  │   Vercel        │      │     Render             │   │
│  │   (Frontend)    │      │     (Backend)          │   │
│  │                 │      │                        │   │
│  │  Next.js SSR    │ ←──→ │  FastAPI + pgvector    │   │
│  │  Edge Network   │      │  PostgreSQL            │   │
│  └─────────────────┘      └────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Environment Variables

### Backend

| Variable                | Required | Description                     |
| ----------------------- | -------- | ------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string    |
| `SUPABASE_URL`          | Yes      | Supabase project URL            |
| `SUPABASE_ANON_KEY`     | Yes      | Supabase public key             |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes  | Supabase admin key              |
| `OPENAI_API_KEY`        | No*      | OpenAI API key                  |
| `GEMINI_API_KEY`        | No*      | Google Gemini API key           |
| `ANTHROPIC_API_KEY`     | No*      | Anthropic API key               |
| `EMBEDDING_PROVIDER`    | No       | `openai` / `gemini` / `local`   |
| `LLM_PROVIDER`          | No       | `openai` / `gemini` / `anthropic`|
| `LLM_MODEL`             | No       | Model name (default: gpt-4o)    |
| `JWT_SECRET`            | Yes      | JWT signing secret              |
| `JWT_REFRESH_SECRET`    | Yes      | Refresh token signing secret    |
| `CORS_ORIGINS`          | No       | Comma-separated origins         |
| `STORAGE_BUCKET`        | No       | Supabase Storage bucket name    |

*At least one LLM provider key is required for AI features.

### Frontend

| Variable                        | Required | Description               |
| ------------------------------- | -------- | ------------------------- |
| `NEXT_PUBLIC_API_URL`           | Yes      | Backend API base URL      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase public key       |

## Security Considerations

- JWT tokens verified on every protected request via `SupabaseJWTMiddleware`
- Rate limiting: 100 requests per minute per client
- CORS restricted to configured origins
- File upload validation: type whitelist + 50 MB size limit
- All database queries use parameterized statements
- Supabase service role key never exposed to frontend
- Row-level security available via Supabase for direct client access
