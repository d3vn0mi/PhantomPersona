# PhantomPersona — Hide in Plain Sight

**By [D3vn0mi](https://github.com/d3vn0mi)**

A privacy tool that degrades the quality of tracking data by injecting plausible noise into your digital footprint. Instead of blocking trackers (which is detectable), PhantomPersona makes the collected data **unreliable**.

## The Problem

Ad-tech companies and data brokers build detailed profiles of your online behavior — searches, browsing habits, purchase intent, location patterns. Traditional privacy tools (ad blockers, VPNs, tracker blockers) try to **prevent** data collection, but this approach is increasingly detectable and circumvented.

## How PhantomPersona Works

PhantomPersona takes a different approach: **data poisoning**. It generates realistic fictional personas using LLMs and then autonomously browses the web as those personas, flooding trackers with plausible but fake data. The result is that your real signal gets buried in noise.

### The Pipeline

```
You create a persona (via the web wizard or API)
        │
        ▼
LLM generates a full profile: name, interests,
shopping habits, favorite sites, search topics
        │
        ▼
Plan engine creates a daily browsing plan:
searches, page visits, product browsing — with
realistic timing and dwell patterns
        │
        ▼
Chrome extension executes the plan in background
tabs while spoofing your browser fingerprint
        │
        ▼
Trackers collect the noise data, degrading
the accuracy of your real profile
```

### Noise Intensity Levels

| Level | Actions/Day | Use Case |
|-------|------------|----------|
| **Subtle** | ~10 | Light cover — occasional fake searches and page visits |
| **Moderate** | ~35 | Meaningful noise — regular browsing across multiple personas |
| **Heavy** | ~100 | Full obfuscation — constant activity that buries your real data |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Web Portal                        │
│            Next.js 14 + Tailwind CSS                │
│   Dashboard │ Persona Wizard │ Activity Log          │
│                  :3000                               │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                    Backend                           │
│               Python / FastAPI                       │
│   Persona CRUD │ Plan Engine │ LLM Service           │
│   Scheduler    │ Noise API   │ SQLite DB             │
│                  :8000                               │
└──────────────────────┬──────────────────────────────┘
                       │ Polling (every 5 min)
┌──────────────────────▼──────────────────────────────┐
│               Chrome Extension (MV3)                 │
│   Phantom Browser │ Fingerprint Spoofer              │
│   Behavioral Noise │ Tab Management                  │
└─────────────────────────────────────────────────────┘
```

### Components

| Component | Stack | Description |
|-----------|-------|-------------|
| **Backend** | Python, FastAPI, SQLAlchemy, SQLite | REST API with LLM-powered persona generation, browsing plan engine, scheduler, and storage |
| **Web Portal** | Next.js 14, React 18, Tailwind CSS | Dashboard with stats, 5-step persona creation wizard, persona detail views, and activity log |
| **Extension** | Chrome MV3, Service Worker | Background browsing execution, canvas/WebGL/font fingerprint spoofing, mouse/scroll/keystroke behavioral noise |
| **Daemon** | Python, FastAPI | Scheduled persona engine with config-driven orchestration (being merged into backend — see [ROADMAP.md](ROADMAP.md)) |

### Modules

| Module | Layer | What It Does |
|--------|-------|-------------|
| LLM Engine | Backend | Generates personas, search queries, and browsing plans via Ollama or OpenAI |
| Persona API | Backend | CRUD operations + LLM-powered persona creation from wizard answers |
| Plan Engine | Backend | Generates daily browsing plans per persona with realistic timing |
| Scheduler | Daemon | Controls timing and frequency of phantom activity (search, browsing, persona rotation) |
| Phantom Browser | Extension | Opens background tabs, executes searches, visits pages, browses products |
| Fingerprint Randomizer | Extension | Spoofs canvas, WebGL, hardware concurrency, and screen dimensions per session |
| Behavioral Camouflage | Extension | Injects mouse jitter, scroll noise, and keystroke timing perturbation |
| Web Dashboard | Web Portal | Stats overview, persona grid with active/inactive indicators, activity feed |
| Persona Wizard | Web Portal | 5-step guided flow: interests, demographics, shopping style, noise intensity, review |

## Deployment

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An OpenAI API key **or** a local [Ollama](https://ollama.ai) instance

### 1. Clone and configure

```bash
git clone https://github.com/d3vn0mi/PhantomPersona.git
cd PhantomPersona
cp .env.example .env
```

Edit `.env` and set your LLM provider:

```bash
# Option A: OpenAI (cloud)
OPENAI_API_KEY=sk-your-key-here
LLM_BACKEND=openai
OPENAI_MODEL=gpt-4o-mini

# Option B: Ollama (local, more private)
LLM_BACKEND=ollama
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web Portal | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

### 3. Install the Chrome extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/` directory
4. Click the extension icon and set the backend URL to `http://localhost:8000`

### 4. Create your first persona

1. Open http://localhost:3000
2. Click **New Persona**
3. Walk through the 5-step wizard (interests, demographics, shopping style, noise level)
4. Activate the persona
5. Click **Generate Plan** to create the first browsing plan

The extension will start executing the plan automatically within 5 minutes.

### Stopping

```bash
docker compose down
```

## Production Deployment (VPS)

To serve PhantomPersona on the public internet you need HTTPS, a reverse proxy, and a domain name. The production setup uses [Caddy](https://caddyserver.com/) which handles TLS certificates from Let's Encrypt automatically.

### Requirements

- A VPS (any provider: DigitalOcean, Hetzner, Linode, etc.) with Docker installed
- A domain name pointing to your VPS IP (A record)
- Ports 80 and 443 open in your firewall

### 1. DNS

Create an A record pointing your domain to your VPS:

```
phantom.yourdomain.com  →  203.0.113.10  (your VPS IP)
```

### 2. Firewall

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# Block direct access to app ports (Caddy proxies internally)
sudo ufw deny 3000/tcp
sudo ufw deny 8000/tcp
```

### 3. Configure

```bash
git clone https://github.com/d3vn0mi/PhantomPersona.git
cd PhantomPersona
cp .env.example .env
```

Edit `.env` with your API keys, then edit `Caddyfile` and replace `phantom.example.com` with your actual domain:

```
phantom.yourdomain.com {
    ...
}
```

### 4. Launch

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Caddy will automatically obtain a TLS certificate from Let's Encrypt. Your app will be available at `https://phantom.yourdomain.com` within a minute or two.

### Verify

```bash
# Check all containers are running
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Check Caddy logs for certificate status
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs caddy

# Test the health endpoint
curl https://phantom.yourdomain.com/health
```

### Updating

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Production security notes

> **Warning**: PhantomPersona does not currently have authentication (see [ROADMAP.md](ROADMAP.md) Phase 1.3). Until auth is implemented, anyone who knows your URL can access the API and manage personas. Consider one of these mitigations:
>
> - **HTTP basic auth via Caddy** — add `basicauth` to the Caddyfile
> - **VPN/Tailscale** — only expose the service on a private network
> - **IP allowlist** — restrict firewall rules to your IP

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Web Portal

```bash
cd web
npm install
npm run dev    # → http://localhost:3000
```

### Daemon (optional, being merged into backend)

```bash
cd daemon
pip install --upgrade pip setuptools
pip install -e .
phantom-daemon --config config.yaml
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_BACKEND` | `ollama` | LLM provider: `ollama` or `openai` |
| `OPENAI_API_KEY` | — | OpenAI API key (required if using OpenAI) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3` | Ollama model to use |
| `DATABASE_URL` | `sqlite+aiosqlite:///./phantom.db` | Database connection string |
| `DAEMON_URL` | `http://daemon:8000` | Backend URL (used by the web portal in Docker) |

## API Overview

The backend exposes a REST API at `http://localhost:8000`. Full interactive docs are available at `/docs` (Swagger UI).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/personas` | Create a persona from wizard answers |
| `GET` | `/api/personas` | List all personas |
| `GET` | `/api/personas/{id}` | Get a persona by ID |
| `PATCH` | `/api/personas/{id}` | Update a persona (toggle active, etc.) |
| `DELETE` | `/api/personas/{id}` | Delete a persona |
| `POST` | `/api/plans/generate/{persona_id}` | Generate a browsing plan for a persona |
| `GET` | `/api/plans/next` | Poll for the next unexecuted plan (used by extension) |
| `POST` | `/api/plans/{plan_id}/complete` | Mark a plan as executed |
| `GET` | `/api/plans/activity` | Get activity log |
| `GET` | `/health` | Health check |

## Project Structure

```
PhantomPersona/
├── backend/                  # Python/FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app, lifespan, health endpoint
│   │   ├── db.py             # SQLAlchemy async setup
│   │   ├── models/           # ORM models (Persona, BrowsingPlan)
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── routers/          # API route handlers
│   │   └── services/         # LLM client, persona generation, plan generation
│   └── requirements.txt
├── web/                      # Next.js 14 web portal
│   ├── src/
│   │   ├── app/              # Pages (dashboard, persona detail, activity)
│   │   ├── components/       # React components (wizard, cards, feed)
│   │   └── lib/              # API client
│   ├── package.json
│   └── tailwind.config.ts
├── extension/                # Chrome MV3 extension
│   ├── background.js         # Service worker — plan polling + tab execution
│   ├── content.js            # Fingerprint spoofing + behavioral noise
│   ├── popup/                # Extension popup UI
│   ├── lib/                  # Fingerprint, behavioral, and browser modules
│   └── manifest.json
├── daemon/                   # Scheduled persona engine (merging into backend)
│   ├── phantom_engine/       # Scheduler, config, LLM, server
│   ├── config.yaml
│   └── pyproject.toml
├── docker-compose.yml        # Dev: web + backend services
├── docker-compose.prod.yml   # Prod: adds Caddy reverse proxy + HTTPS
├── Caddyfile                 # Caddy config (domain, routing, headers)
├── .env.example              # Environment variable template
├── .gitignore
├── LICENSE
└── ROADMAP.md                # Development roadmap
```

## Troubleshooting

### `ModuleNotFoundError: No module named 'setuptools.backends'`

Your system `setuptools` is too old. Upgrade before installing the daemon:

```bash
pip install --upgrade pip setuptools
```

### `next.config.ts` not supported

Your Next.js version doesn't support TypeScript config files:

```bash
npm install next@latest
# or
mv next.config.ts next.config.js
```

### Extension not connecting to backend

1. Check that the backend is running at `http://localhost:8000/health`
2. Open the extension popup and verify the backend URL is correct
3. Check the extension's service worker logs in `chrome://extensions` → Details → Inspect views

### LLM not responding

- **Ollama**: Ensure Ollama is running (`ollama serve`) and the model is pulled (`ollama pull llama3`)
- **OpenAI**: Verify your API key is set in `.env` and has available credits

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development plan. Key upcoming milestones:

- **v0.2** — Merge daemon into backend, add authentication, error handling, tests
- **v0.3** — Fingerprint spoofing overhaul, realistic behavioral noise, cookie isolation
- **v0.4** — Analytics dashboard, real-time activity feed, settings UI
- **v0.5** — Adaptive personas, privacy scoring, multi-browser support
- **v1.0** — Production Docker deployment, CI/CD, security audit

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

Copyright (c) 2026 D3vn0mi
