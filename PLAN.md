# Phase 1 Implementation Plan

## Execution Order

Work is ordered by dependency — later tasks build on earlier ones.

---

## Step 1: Backend Config Overhaul
> Merge daemon config into backend using Pydantic Settings

**Files to create/modify:**
- **Create** `backend/app/config.py` — Unified Pydantic Settings model
- **Create** `backend/.env` — Default environment config
- **Modify** `backend/app/db.py` — Use config for DB URL instead of hardcoded string
- **Modify** `backend/app/services/llm.py` — Use config instead of `os.environ` calls
- **Modify** `backend/app/main.py` — Import and wire config

**Design:**
```python
# backend/app/config.py
from pydantic_settings import BaseSettings

class LLMSettings(BaseModel):
    backend: str = "ollama"        # "ollama" | "openai"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

class SchedulerSettings(BaseModel):
    enabled: bool = True
    search_interval: int = 10      # minutes
    browsing_interval: int = 15
    active_hours: tuple[int, int] = (8, 22)
    max_concurrent: int = 3

class NoiseSettings(BaseModel):
    searches_per_cycle: int = 5
    pages_per_cycle: int = 8
    products_per_cycle: int = 3
    persona_rotation_hours: int = 4

class FingerprintSettings(BaseModel):
    rotation_interval: int = 30    # minutes

class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./phantom.db"
    secret_key: str = "change-me-in-production"
    llm: LLMSettings = LLMSettings()
    scheduler: SchedulerSettings = SchedulerSettings()
    noise: NoiseSettings = NoiseSettings()
    fingerprint: FingerprintSettings = FingerprintSettings()

    model_config = SettingsConfigDict(env_file=".env", env_nested_delimiter="__")
```

---

## Step 2: Merge Daemon Scheduler into Backend
> Port the 4 async loops as a FastAPI background service

**Files to create/modify:**
- **Create** `backend/app/services/scheduler.py` — Adapted from daemon's scheduler
- **Create** `backend/app/models/noise_event.py` — NoiseEvent DB model (replace in-memory queue)
- **Create** `backend/app/schemas/noise.py` — Noise event schemas
- **Create** `backend/app/routers/noise.py` — `/api/noise`, `/api/fingerprint`, `/api/form-data` endpoints
- **Modify** `backend/app/main.py` — Start/stop scheduler in lifespan, include noise router
- **Modify** `backend/app/services/llm.py` — Add persona-aware generation methods from daemon

**Key decisions:**
- NoiseEvent stored in SQLite (not in-memory) so events survive restarts
- Scheduler uses the backend's existing LLM service (multi-provider, not Ollama-only)
- Scheduler respects `active_hours` config (daemon defined but never enforced this)
- `SCHEDULER_ENABLED=false` allows running backend without scheduling

**New DB model:**
```python
class NoiseEvent(Base):
    __tablename__ = "noise_events"
    id: str (PK, UUID)
    persona_id: str (FK to personas.id, nullable)
    event_type: str  # search | browse | shop | persona_rotate
    payload: str     # JSON
    delivered: bool = False
    created_at: datetime
```

**New endpoints:**
- `GET /api/noise/{event_type}?limit=10` — Fetch pending noise events
- `GET /api/noise?limit=20` — Fetch all pending events
- `GET /api/fingerprint` — Deterministic fingerprint config (ported from daemon)
- `GET /api/form-data` — LLM-generated fake form data
- `GET /api/status` — Scheduler status, persona, stats, queue depth
- `POST /api/persona/rotate` — Force persona rotation

---

## Step 3: User Model & Authentication
> JWT-based auth replacing hardcoded "default" user

**Files to create/modify:**
- **Create** `backend/app/models/user.py` — User model
- **Create** `backend/app/schemas/auth.py` — Login/register/token schemas
- **Create** `backend/app/routers/auth.py` — Registration, login, token refresh
- **Create** `backend/app/services/auth.py` — Password hashing, JWT creation/validation
- **Create** `backend/app/dependencies.py` — `get_current_user` dependency
- **Modify** `backend/app/models/persona.py` — FK to User
- **Modify** `backend/app/models/plan.py` — FK to User (via persona)
- **Modify** `backend/app/routers/personas.py` — Replace DEFAULT_USER with auth dependency
- **Modify** `backend/app/routers/plans.py` — Replace DEFAULT_USER with auth dependency
- **Modify** `backend/app/routers/noise.py` — Add auth dependency
- **Modify** `backend/requirements.txt` — Add `python-jose[cryptography]`, `passlib[bcrypt]`

**New DB model:**
```python
class User(Base):
    __tablename__ = "users"
    id: str (PK, UUID)
    email: str (unique, indexed)
    hashed_password: str
    api_key: str (unique, indexed)  # For extension auth
    is_active: bool = True
    created_at: datetime
```

**Auth flow:**
- Web portal: email/password → JWT in httpOnly cookie
- Extension: API key in `X-API-Key` header
- `get_current_user` dependency checks both JWT and API key

---

## Step 4: Database Migrations with Alembic
> Track schema changes properly

**Files to create/modify:**
- **Create** `backend/alembic.ini` — Alembic configuration
- **Create** `backend/alembic/` — Migrations directory
- **Create** `backend/alembic/env.py` — Async SQLAlchemy migration env
- **Create** migration: initial schema (personas, plans)
- **Create** migration: add users table
- **Create** migration: add noise_events table
- **Create** migration: add user FK to personas
- **Modify** `backend/app/main.py` — Remove `create_all()`, use Alembic
- **Modify** `backend/app/db.py` — Export metadata for Alembic

---

## Step 5: Error Handling & Resilience
> Global error handling, LLM retry logic, structured logging

**Files to create/modify:**
- **Create** `backend/app/middleware.py` — Global exception handler, request ID middleware
- **Modify** `backend/app/services/llm.py` — Add retry with exponential backoff (3 attempts)
- **Modify** `backend/app/services/llm.py` — Validate LLM JSON against Pydantic schemas
- **Modify** `backend/app/main.py` — Add middleware, configure structured logging
- **Modify** `extension/background.js` — Exponential backoff on failed polls
- **Modify** `extension/background.js` — Validate plan_data structure before execution
- **Modify** `extension/background.js` — Handle tab-already-closed errors

**Backend middleware design:**
```python
# Request ID middleware — adds X-Request-ID to all responses
# Global exception handler — catches unhandled exceptions, logs context, returns 500
# Structured logging — JSON format with request_id, user_id, endpoint
```

**LLM retry design:**
```python
async def generate_json(prompt: str, schema: type[BaseModel] | None = None) -> dict:
    for attempt in range(3):
        try:
            result = await generate(prompt)
            parsed = _extract_json(result)
            if schema:
                schema.model_validate(parsed)  # Validate against Pydantic schema
            return parsed
        except (ValueError, ValidationError):
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt)
```

---

## Step 6: Clean Extension Dead Code
> Consolidate duplicate code, wire lib/ files properly

**Files to modify:**
- **Delete** `extension/lib/phantom-browser.js` — Entirely dead code
- **Modify** `extension/background.js` — Refactor tab functions into a clean module
- **Modify** `extension/content.js` — Remove inline fingerprint/behavioral code, inject lib/ files instead
- **Modify** `extension/manifest.json` — Add `lib/fingerprint.js` and `lib/behavioral.js` as content scripts (world: MAIN)
- **Modify** `extension/popup/popup.js` — Replace hardcoded dashboard URL with configurable setting

**Manifest changes:**
```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "web_accessible_resources": [{
    "resources": ["lib/fingerprint.js", "lib/behavioral.js"],
    "matches": ["<all_urls>"]
  }]
}
```

`content.js` becomes thin — just checks if enabled, then injects lib scripts into page context.

---

## Step 7: Web Portal Auth Integration
> Add login page and auth context

**Files to create/modify:**
- **Create** `web/src/lib/auth.tsx` — Auth context provider (JWT storage, login/logout/register)
- **Create** `web/src/app/login/page.tsx` — Login/register page
- **Modify** `web/src/app/layout.tsx` — Wrap with AuthProvider
- **Modify** `web/src/lib/api.ts` — Add JWT to all API requests
- **Modify** other pages — Redirect to login if not authenticated

---

## Step 8: Basic Test Suite
> pytest for backend, covering critical paths

**Files to create/modify:**
- **Create** `backend/tests/conftest.py` — Test fixtures (async test client, in-memory DB, mock LLM)
- **Create** `backend/tests/test_auth.py` — Registration, login, token refresh, API key auth
- **Create** `backend/tests/test_personas.py` — CRUD, validation, auth enforcement
- **Create** `backend/tests/test_plans.py` — Generation, polling, completion
- **Create** `backend/tests/test_llm.py` — Mock LLM, JSON parsing, retry logic
- **Create** `backend/tests/test_noise.py` — Noise endpoints, fingerprint, form-data
- **Modify** `backend/requirements.txt` — Add `pytest`, `pytest-asyncio`, `httpx`

**Test approach:**
- All tests use in-memory SQLite (`sqlite+aiosqlite://`)
- LLM tests mock `httpx.AsyncClient` — no real API calls
- Auth tests verify JWT flow and API key flow
- Each test file is self-contained with proper setup/teardown

---

## Summary of New Files

```
backend/
├── .env                          # Default environment config
├── alembic.ini                   # Alembic config
├── alembic/
│   ├── env.py                    # Async migration environment
│   ├── script.py.mako            # Migration template
│   └── versions/                 # Migration files
├── app/
│   ├── config.py                 # Unified Pydantic Settings
│   ├── dependencies.py           # get_current_user
│   ├── middleware.py              # Error handling, request ID, logging
│   ├── models/
│   │   ├── user.py               # User model
│   │   └── noise_event.py        # NoiseEvent model
│   ├── schemas/
│   │   ├── auth.py               # Auth schemas
│   │   └── noise.py              # Noise event schemas
│   ├── routers/
│   │   ├── auth.py               # Auth endpoints
│   │   └── noise.py              # Noise/fingerprint/form-data endpoints
│   └── services/
│       ├── auth.py               # Password hashing, JWT
│       └── scheduler.py          # Background noise scheduler
└── tests/
    ├── conftest.py
    ├── test_auth.py
    ├── test_personas.py
    ├── test_plans.py
    ├── test_llm.py
    └── test_noise.py

web/src/
├── lib/auth.tsx                  # Auth context
└── app/login/page.tsx            # Login page

extension/
├── (delete lib/phantom-browser.js)
├── manifest.json                 # Updated content scripts
├── content.js                    # Thinned — delegates to lib/
├── background.js                 # Backoff + validation
└── popup/popup.js                # Configurable dashboard URL
```

## Modified Existing Files

| File | Changes |
|------|---------|
| `backend/app/main.py` | Config, scheduler lifespan, middleware, noise router, remove create_all() |
| `backend/app/db.py` | Use config for DB URL, export metadata |
| `backend/app/services/llm.py` | Config-based, retry logic, schema validation, persona-aware methods |
| `backend/app/models/persona.py` | Add user_id FK to User model |
| `backend/app/routers/personas.py` | Auth dependency, remove DEFAULT_USER |
| `backend/app/routers/plans.py` | Auth dependency, remove DEFAULT_USER |
| `backend/requirements.txt` | Add jose, passlib, pytest, pytest-asyncio |
| `web/src/app/layout.tsx` | AuthProvider wrapper |
| `web/src/lib/api.ts` | JWT in headers |
