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

## Deploy on DigitalOcean (step by step)

This repo ships a Droplet-oriented production stack:

- **Managed PostgreSQL** for the database
- **One Droplet** running Docker Compose (`api` + `web` + `caddy`)
- **Optional Ollama** on the same Droplet (`--profile ai`)
- **HTTP via Droplet IP** by default (no custom domain required)

Site URL shape: `http://YOUR_DROPLET_IP/`

### Step 0 — Push the code

Commit and push this repo to GitHub so you can clone it on the Droplet.

### Step 1 — Create Managed PostgreSQL

1. In DigitalOcean: **Databases → Create Database → PostgreSQL** (v16 if available).
2. Choose the same region you’ll use for the Droplet.
3. After it’s ready, open the database and copy the **connection details**.
4. Under **Users & Databases**, note the username, password, host, port (often `25060`), and database name.
5. Under **Trusted Sources**, allow your Droplet (add it after Step 2, or temporarily allow your IP for testing).

Build a URL like:

```text
postgresql+psycopg://USER:PASSWORD@HOST:25060/DATABASE?sslmode=require
```

URL-encode special characters in the password (`@`, `#`, `/`, etc.).

### Step 2 — Create a Droplet

1. **Create → Droplets**.
2. Image: **Ubuntu 24.04 LTS**.
3. Size: **2 GB+** without Ollama, **4–8 GB** if running Ollama on the same box.
4. Datacenter: same region as the database.
5. Auth: SSH key (recommended).
6. Create the Droplet and copy its **public IP**.

### Step 3 — Skip custom domain (optional later)

No domain is required. You’ll use:

```text
http://YOUR_DROPLET_IP/
```

Droplets do not get a free `*.ondigitalocean.app` hostname (that’s App Platform). The public IP is the default access method.

### Step 4 — Open firewall ports

In **Networking → Firewalls** (or the Droplet firewall), allow:

- `22` (SSH)
- `80` (HTTP)

Also add this Droplet as a **Trusted Source** on the Managed Database.

### Step 5 — Install Docker on the Droplet

SSH in:

```bash
ssh root@YOUR_DROPLET_IP
```

Then:

```bash
apt-get update
apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

### Step 6 — Clone and configure

```bash
git clone https://github.com/YOUR_USER/ai-trends.git
cd ai-trends
cp .env.prod.example .env.prod
nano .env.prod
```

Fill in at least:

```bash
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:25060/DATABASE?sslmode=require
CORS_ORIGINS=http://YOUR_DROPLET_IP
SEED_ON_STARTUP=true
OLLAMA_MODEL=llama3.2:latest
OLLAMA_BASE_URL=http://ollama:11434
```

Save and exit.

### Step 7 — Start the app (without Ollama first)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

When the API is healthy, open:

- `http://YOUR_DROPLET_IP/` — UI
- `http://YOUR_DROPLET_IP/api/health` — should show `"database":"ok"`

If health fails, check DB trusted sources, `DATABASE_URL`, and API logs.

### Step 8 — (Optional) Enable Ollama insights

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod --profile ai up -d
docker compose -f docker-compose.prod.yml exec ollama ollama pull llama3.2:latest
```

Re-check:

```bash
curl -s http://YOUR_DROPLET_IP/api/health
```

Then use **Ask Ollama** in the UI. First response can be slow on CPU.

### Step 9 — Ongoing updates

On the Droplet:

```bash
cd ~/ai-trends
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
# if using Ollama:
# docker compose -f docker-compose.prod.yml --env-file .env.prod --profile ai up -d --build
```

### Production files in this repo

| File | Role |
| --- | --- |
| `docker-compose.prod.yml` | API + web + Caddy (+ optional Ollama) |
| `.env.prod.example` | Template for Droplet secrets |
| `Dockerfile` | Builds the React app into an Nginx image |
| `deploy/Caddyfile` | HTTP router: `/api` → API, everything else → UI |
| `deploy/nginx-web.conf` | SPA static file serving |

### Cost / sizing notes

- Managed Postgres + a Droplet is enough for the MVP.
- 8 GB is a good size if you want Ollama on the same box.
- Do not commit `.env.prod` (it is gitignored).
