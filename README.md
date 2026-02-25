# PhantomPersona — Hide in Plain Sight

Privacy tool that degrades the quality of tracking data by injecting plausible noise
into your digital footprint. Instead of blocking trackers (which is detectable),
Phantom makes the collected data unreliable.

## Architecture

- **Backend** (Python/FastAPI): REST API with LLM-powered persona generation, browsing plan engine, SQLite storage
- **Web Portal** (Next.js 14 + Tailwind): Dashboard, 5-step persona wizard, persona detail views, activity log
- **Extension** (Chrome MV3): Background browsing, fingerprint spoofing, behavioral noise injection
- **Daemon** (Python): Scheduled persona engine with config-driven orchestration

## Quick Start

```bash
# 1. Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Web Portal
cd web
npm install
npm run dev    # → http://localhost:3000

# 3. Extension
# Load extension/ as unpacked in chrome://extensions

# 4. Daemon (optional)
cd daemon
pip install -e .
phantom-daemon --config config.yaml
```

## Modules

| Module | Layer | Description |
|--------|-------|-------------|
| LLM Engine | Backend/Daemon | Generates personas, search queries, browsing plans |
| Persona API | Backend | CRUD + LLM-powered persona creation |
| Plan Engine | Backend | Generates daily browsing plans per persona |
| Web Dashboard | Web | Stats, persona grid, activity feed |
| Persona Wizard | Web | 5-step guided persona creation |
| Scheduler | Daemon | Controls timing/frequency of phantom activity |
| Phantom Browser | Extension | Visits pages in background tabs |
| Fingerprint Randomizer | Extension | Rotates canvas, WebGL, fonts, etc. |
| Behavioral Camouflage | Extension | Jitters mouse, scroll, keystrokes |
