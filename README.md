# AI Trends

Local MVP for tracking illustrative AI scaling signals — frontier training compute, notable models, and short Ollama-generated insights. Stack: React (Vite) + FastAPI + PostgreSQL + Ollama.

Inspired by public AI trend research such as [Epoch AI](https://epoch.ai/).

## Prerequisites

Install these on each machine before running the app:

1. **Git**
2. **Node.js 20+** (24 recommended)
3. **Python 3.12+**
4. **PostgreSQL 16** (Homebrew, Postgres.app, or Docker)
5. **Ollama**, then pull a model:
   ```bash
   ollama pull llama3.2:latest
   ```
6. Optional: **Docker Desktop** (for `docker compose` / DigitalOcean-style deploys)

## Setup after cloning

```bash
git clone <your-repo-url>
cd ai-trends

# Frontend
npm install

# Backend
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

`.env`, `.venv`, and `node_modules` are gitignored — recreate them on every new machine.

## Create the database

### Homebrew Postgres

```bash
brew services start postgresql@16
psql -d postgres -c "CREATE USER aitrends WITH PASSWORD 'aitrends' CREATEDB;"
psql -d postgres -c "CREATE DATABASE aitrends OWNER aitrends;"
```

If `psql` isn’t on your PATH, use the Homebrew binary:

```bash
/opt/homebrew/opt/postgresql@16/bin/psql -d postgres
```

### Docker Postgres

Once Docker can pull images:

```bash
docker compose up -d db
```

## Run locally

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — UI
npm run dev
```

| Service | URL |
| --- | --- |
| UI | http://127.0.0.1:5173 |
| API docs | http://127.0.0.1:8000/docs |
| Health | http://127.0.0.1:8000/api/health |

Seed data loads automatically on API startup when `SEED_ON_STARTUP=true`.

## Environment variables

Edit `backend/.env` as needed:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `OLLAMA_BASE_URL` | Ollama HTTP API (default `http://127.0.0.1:11434`) |
| `OLLAMA_MODEL` | Model name (default `llama3.2:latest`) |
| `CORS_ORIGINS` | Allowed frontend origins |
| `SEED_ON_STARTUP` | Seed sample metrics/models on boot |

## Sanity check

```bash
curl http://127.0.0.1:8000/api/health
```

Expect `"database": "ok"` and `"ollama": "ok"`.

## API routes

- `GET /api/health`
- `GET /api/metrics`
- `GET /api/compute-series`
- `GET /api/models?domain=Language`
- `POST /api/insights` with body `{ "question": "..." }`

## DigitalOcean notes

`docker-compose.yml` is set up for a Droplet-style deploy (Postgres + API; optional Ollama profile). Typical production split:

1. Managed Postgres → set `DATABASE_URL` (often with `sslmode=require`)
2. Droplet or App Platform for the API
3. Ollama on the same or a separate host → set `OLLAMA_BASE_URL`
