# PhantomPersona

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

## Quick Start (Docker)

Build and start both services:

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web     | http://localhost:3000 |
| Daemon  | http://localhost:8000 |

Stop everything:

```bash
docker compose down
```

## Project Structure

```
web/       — Next.js frontend (port 3000)
daemon/    — Python/FastAPI backend (port 8000)
```

## Local Development (without Docker)

### Web

```bash
cd web
npm install
npm run dev
```

### Daemon

```bash
cd daemon
pip install --upgrade pip setuptools
pip install -e .
phantom-daemon
```

## Troubleshooting

### `ModuleNotFoundError: No module named 'setuptools.backends'`

Your system `setuptools` is too old. Upgrade it before installing the daemon:

```bash
pip install --upgrade pip setuptools
```

### `next.config.ts` not supported

If you see:

```
Error: Configuring Next.js via 'next.config.ts' is not supported.
```

Upgrade Next.js or rename the config file:

```bash
npm install next@latest
# or
mv next.config.ts next.config.js
```
