# PhantomPersona — Development Roadmap

## Current State (v0.1 — Proof of Concept)

| Component | Completeness | Status |
|-----------|-------------|--------|
| Backend (FastAPI) | ~70% | CRUD works, LLM integration works, no auth/tests |
| Web Portal (Next.js) | ~65% | Dashboard + wizard work, no auth/real-time/charts |
| Chrome Extension | ~40% | Basic polling + tab execution, weak anti-detection |
| Daemon | ~35% | Scheduler runs, but poorly integrated with backend |

**Overall: ~50% — functional PoC, not production-ready.**

---

## Architectural Decisions (Locked In)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Daemon + Backend** | **Merge into single FastAPI service** | Eliminates overlapping LLM calls, persona management, and confusing dual APIs |
| **LLM Strategy** | **Dual-provider (Ollama + OpenAI)** | Local-first for privacy, cloud fallback for quality; user chooses |
| **Database** | **SQLite → PostgreSQL migration path** | SQLite for dev/self-hosted, Postgres for scale; use Alembic migrations |
| **Extension ↔ Backend** | **Extension talks only to backend** | Single API surface; daemon scheduler logic absorbed into backend |
| **Target Audience** | **Both: easy defaults + advanced config** | One-click install for consumers, YAML/env config for power users |

---

## Phase 1 — Foundation & Integration (v0.2)
> **Goal**: Stable, integrated MVP. Everything talks to everything. Nothing crashes silently.

### 1.1 Merge Daemon into Backend (Priority: CRITICAL)
The daemon and backend currently duplicate LLM calls, persona management, and run as separate services. Merge them.

**Tasks:**
- [ ] Move `daemon/phantom_engine/scheduler.py` → `backend/app/services/scheduler.py`
  - Adapt the 4 async loops (search, browsing, persona rotation, cleanup) to run as FastAPI background tasks via lifespan events
  - Enforce `active_hours` and `max_concurrent` from config (currently parsed but ignored)
- [ ] Move `daemon/phantom_engine/config.py` → `backend/app/config.py`
  - Merge with existing backend config; use Pydantic Settings with `.env` file support
  - Add `SCHEDULER_ENABLED=true/false` toggle so backend can run with or without scheduling
- [ ] Move daemon's `/noise`, `/fingerprint`, `/form-data` endpoints → `backend/app/routers/noise.py`
  - Wire them to the existing persona/plan models
- [ ] Delete `daemon/` directory entirely once migration is verified
- [ ] Update extension to only talk to backend (single `BACKEND_URL`)

**Acceptance criteria:**
- Single `uvicorn app.main:app` starts everything (API + scheduler)
- Extension polls one service, gets plans, reports completions
- `docker compose up` runs the full backend

### 1.2 Clean Dead Code in Extension (Priority: HIGH)
Three files in `extension/lib/` are never imported — `background.js` reimplements everything inline.

**Tasks:**
- [ ] Refactor `background.js` to import from `lib/phantom-browser.js` (tab management, search execution, product browsing)
- [ ] Consolidate `content.js` inline fingerprint code with `lib/fingerprint.js` (keep the better version from `lib/` which has 20-pixel canvas noise and more WebGL variants)
- [ ] Consolidate `content.js` inline behavioral code with `lib/behavioral.js` (keep `lib/` version with ±3px mouse jitter and recursive setTimeout)
- [ ] Update `manifest.json` to properly declare ES module imports if needed, or use `importScripts()` for service worker

**Acceptance criteria:**
- Zero duplicate code between `content.js` and `lib/*.js`
- `background.js` imports tab/search functions instead of reimplementing them
- All `lib/*.js` files are actively used

### 1.3 Authentication & Authorization (Priority: HIGH)
Currently zero auth — anyone can access the API and manage personas.

**Tasks:**
- [ ] Add `backend/app/routers/auth.py` — JWT-based auth with email/password
  - Registration, login, token refresh
  - Hash passwords with bcrypt
- [ ] Add `backend/app/models/user.py` — User model with hashed password
- [ ] Add auth middleware to all persona/plan/activity endpoints
- [ ] Add user FK to Persona and Plan models (replace hardcoded `"default"` user)
- [ ] Add login page to web portal (`web/src/app/login/page.tsx`)
- [ ] Add auth context/provider to web portal (`web/src/lib/auth.tsx`)
- [ ] Store JWT in httpOnly cookie or localStorage; add to API client headers
- [ ] Extension: store API key in `chrome.storage.local`, add to request headers

**Acceptance criteria:**
- Cannot access any data without logging in
- Each user sees only their own personas/plans/activity
- Extension authenticates with API key generated from web portal

### 1.4 Error Handling & Resilience (Priority: HIGH)

**Tasks:**
- [ ] Backend: Add structured logging (Python `logging` with JSON formatter)
- [ ] Backend: Add global exception handler middleware
- [ ] Backend: Validate LLM JSON output with schema before saving (currently trusts LLM blindly)
- [ ] Backend: Add retry logic for LLM calls (3 attempts with exponential backoff)
- [ ] Extension `background.js`: Add exponential backoff for failed plan polls (2s, 4s, 8s, 16s)
- [ ] Extension `background.js`: Validate `plan_data` structure before executing
- [ ] Extension `background.js`: Handle tab-already-closed errors gracefully
- [ ] Web portal: Add React error boundaries to all pages
- [ ] Web portal: Replace `console.error` with user-visible toast notifications
- [ ] Web portal: Persist wizard state to `sessionStorage` (currently lost on reload)

**Acceptance criteria:**
- Backend logs all errors with context (request ID, user, endpoint)
- LLM failures don't crash the service — retry, then return a meaningful error
- Extension handles network failures gracefully without flooding the backend
- Web portal shows user-friendly error messages, never blank screens

### 1.5 Database Migrations (Priority: MEDIUM)

**Tasks:**
- [ ] Add Alembic to backend (`alembic init`, configure for async SQLAlchemy)
- [ ] Generate initial migration from existing models
- [ ] Add migration for User model (from 1.3)
- [ ] Add migration for merged daemon tables (noise events, scheduler state)
- [ ] Add `alembic upgrade head` to startup script

**Acceptance criteria:**
- Schema changes are tracked in version control
- `alembic upgrade head` brings any database to current schema
- No more `create_all()` in production

### 1.6 Basic Test Suite (Priority: MEDIUM)

**Tasks:**
- [ ] Add `pytest` + `httpx` to `backend/requirements.txt`
- [ ] `backend/tests/test_personas.py` — CRUD operations, validation, auth
- [ ] `backend/tests/test_plans.py` — Plan generation, polling, completion
- [ ] `backend/tests/test_llm.py` — Mock LLM responses, test JSON parsing, test fallback
- [ ] `web/src/__tests__/PersonaWizard.test.tsx` — Wizard step navigation, validation
- [ ] Add `pytest` to CI (GitHub Actions workflow)

**Acceptance criteria:**
- Backend has >60% test coverage on critical paths
- Tests run in CI on every push
- LLM tests use mocks (no real API calls)

---

## Phase 2 — Anti-Detection Hardening (v0.3)
> **Goal**: Make noise actually effective against modern trackers. Currently too weak and detectable.

### 2.1 Fingerprint Spoofing Overhaul (Priority: CRITICAL)

Current state: 10-20 pixel canvas noise, basic WebGL vendor swap, hardcoded concurrency. Modern fingerprinters will see through this.

**Tasks:**
- [ ] **Canvas**: Replace random pixel noise with deterministic per-session hash-based noise across the entire canvas (not just 10-20 pixels). Use a seeded PRNG so the fingerprint is consistent within a session but changes between sessions
- [ ] **WebGL**: Spoof `UNMASKED_VENDOR_WEBGL` and `UNMASKED_RENDERER_WEBGL` via `EXT_debug_renderer_info` (currently missing). Add shader precision spoofing
- [ ] **Fonts**: Add font enumeration spoofing — intercept `document.fonts.check()` and CSS-based font detection. Rotate available font lists per session
- [ ] **Screen**: Randomize `screen.width`, `screen.height`, `screen.colorDepth`, `devicePixelRatio` with plausible combinations (not random noise — use real device profiles)
- [ ] **Timezone**: Spoof `Intl.DateTimeFormat().resolvedOptions().timeZone` and `Date.getTimezoneOffset()` to match persona's location
- [ ] **Language**: Spoof `navigator.language`, `navigator.languages`, and `Accept-Language` header to match persona
- [ ] **User Agent**: Rotate UA strings from a curated pool of real browser UAs; keep UA consistent with spoofed screen/platform
- [ ] **AudioContext**: Add AudioContext fingerprint noise (oscillator output perturbation)
- [ ] **Device profiles**: Create `extension/lib/device-profiles.json` with 50+ real device configurations (screen, UA, fonts, platform, GPU) to ensure spoofed values are internally consistent

**Acceptance criteria:**
- Passes Panopticlick/AmIUnique with a different fingerprint each session
- Spoofed values are internally consistent (no "iPhone UA with Windows screen resolution")
- Fingerprint remains stable within a single browsing session

### 2.2 Behavioral Noise Improvement (Priority: HIGH)

Current state: ±2px mouse jitter every 2-5s with 30% skip rate. This is detectable as artificial.

**Tasks:**
- [ ] **Mouse**: Replace uniform random jitter with Perlin noise curves that mimic natural hand tremor. Vary speed and acceleration, not just position
- [ ] **Scroll**: Add realistic scroll patterns — fast scrolls to sections, slow reading scrolls, scroll-stop-scroll patterns. Current ±20px random is unrealistic
- [ ] **Typing**: Implement realistic keystroke dynamics — variable inter-key delays based on key distance, burst typing, pauses for "thinking". Current `compositionupdate` events don't actually affect timing
- [ ] **Click patterns**: Add occasional random clicks on non-interactive elements, hover pauses before clicking links
- [ ] **Page engagement**: Vary dwell times based on page content length (currently fixed 3-15s)
- [ ] **Tab switching**: Simulate natural tab switching patterns (not just "open tab, wait, close")

**Acceptance criteria:**
- Behavioral patterns pass bot detection services (reCAPTCHA, DataDome)
- Mouse movement traces look human when plotted
- No fixed timing intervals detectable via statistical analysis

### 2.3 Cookie & Storage Management (Priority: HIGH)

**Tasks:**
- [ ] Add cookie isolation per persona — clear first-party cookies between persona sessions
- [ ] Clear `localStorage`, `sessionStorage`, `IndexedDB` between persona rotations
- [ ] Optionally inject fake tracking cookies to pollute ad profiles
- [ ] Add cache partitioning (clear HTTP cache between personas)

**Acceptance criteria:**
- No cross-persona data leakage via cookies or storage
- Ad trackers see different user profiles per persona

### 2.4 Network-Level Privacy (Priority: MEDIUM)

**Tasks:**
- [ ] Add optional proxy support (SOCKS5/HTTP) — rotate per persona
- [ ] Add `Referer` header spoofing for phantom browsing (currently sends real referer)
- [ ] Randomize `Accept-Encoding`, `Accept-Language` headers to match persona
- [ ] Add optional DNS-over-HTTPS to prevent DNS-level tracking

**Acceptance criteria:**
- Phantom traffic can optionally route through proxies
- Request headers don't leak real user identity
- DNS queries for phantom browsing are encrypted (when enabled)

---

## Phase 3 — UX & Intelligence (v0.4)
> **Goal**: Make the web portal genuinely useful and informative. Users should understand what Phantom is doing and how effective it is.

### 3.1 Analytics Dashboard (Priority: HIGH)

**Tasks:**
- [ ] Add chart library (`recharts` or `chart.js`) to web portal
- [ ] **Noise effectiveness score**: Track fingerprint entropy over time (how different does the user look vs. baseline?)
- [ ] **Activity timeline**: Line chart showing phantom actions per day/week
- [ ] **Persona breakdown**: Pie chart of actions by persona
- [ ] **Action heatmap**: Calendar heatmap showing activity distribution (should look natural, not uniform)
- [ ] **Category breakdown**: Bar chart of action types (searches, page visits, shopping)
- [ ] Add `/api/analytics` endpoint to backend aggregating activity data

**Acceptance criteria:**
- Dashboard shows at-a-glance privacy health metrics
- Users can see trends over time (is noise increasing? decreasing?)
- Charts update when new activity arrives

### 3.2 Real-Time Activity Feed (Priority: MEDIUM)

**Tasks:**
- [ ] Add WebSocket support to backend (`/ws/activity`)
- [ ] Stream new activity events to web portal in real-time
- [ ] Add live status indicator showing current phantom action ("Searching for 'hiking boots'...")
- [ ] Add browser notifications for important events (persona rotation, errors)

**Acceptance criteria:**
- Activity feed updates without page refresh
- Users can watch phantom actions happen in real-time

### 3.3 Settings & Configuration Page (Priority: MEDIUM)

**Tasks:**
- [ ] Add `web/src/app/settings/page.tsx`
- [ ] **LLM configuration**: Choose provider (Ollama/OpenAI), enter API keys, test connection
- [ ] **Schedule settings**: Active hours, action frequency, intensity slider
- [ ] **Extension settings**: Backend URL, enable/disable toggles per noise type
- [ ] **Account settings**: Change password, export data, delete account
- [ ] **Advanced**: Database path, log level, proxy configuration
- [ ] Store settings in backend DB (not just env vars)

**Acceptance criteria:**
- All configuration possible through the web UI (no YAML editing required for basic users)
- Advanced users can still use config files / env vars (config file overrides UI settings)

### 3.4 Onboarding Flow (Priority: MEDIUM)

**Tasks:**
- [ ] Add first-run detection (no personas exist)
- [ ] Step-by-step setup: Install extension → Configure LLM → Create first persona → Activate
- [ ] Extension connection check (is extension installed and communicating?)
- [ ] LLM connection check (is Ollama running? Is API key valid?)

**Acceptance criteria:**
- New users can go from install to first phantom activity in under 5 minutes
- Clear feedback at each step (green checkmarks, error messages)

### 3.5 Pagination & Performance (Priority: LOW)

**Tasks:**
- [ ] Add cursor-based pagination to `/api/personas`, `/api/activity` endpoints
- [ ] Add pagination controls to web portal lists
- [ ] Add search/filter to persona list
- [ ] Lazy-load activity feed entries

**Acceptance criteria:**
- App remains responsive with 100+ personas and 10,000+ activity entries

---

## Phase 4 — Advanced Features (v0.5)
> **Goal**: Differentiate from basic privacy tools. Add features that make PhantomPersona uniquely powerful.

### 4.1 Persona Intelligence (Priority: HIGH)

**Tasks:**
- [ ] **Adaptive personas**: LLM evolves persona behavior over time (interests shift naturally, not static)
- [ ] **Contextual browsing**: Generate browsing plans that follow logical chains (search → read article → visit product → compare prices) instead of random disconnected actions
- [ ] **Seasonal awareness**: Adjust behavior for holidays, events, seasons (searching for "christmas gifts" in December, not July)
- [ ] **Interest graph**: Build a coherent interest graph per persona so browsing patterns are internally consistent

**Acceptance criteria:**
- Persona browsing patterns look like a real person's 30-day history
- No obviously artificial patterns (e.g., searching 5 unrelated topics in 5 minutes)

### 4.2 Privacy Score & Threat Assessment (Priority: HIGH)

**Tasks:**
- [ ] Integrate with fingerprinting test services to measure actual fingerprint uniqueness
- [ ] Score privacy posture: how identifiable is the user with vs. without Phantom?
- [ ] Show which tracking vectors are covered and which are still exposed
- [ ] Recommendations engine: "Enable font spoofing to improve your score by 15%"

**Acceptance criteria:**
- Users see a concrete, measurable privacy improvement score
- Actionable recommendations to improve privacy

### 4.3 Multi-Browser Support (Priority: MEDIUM)

**Tasks:**
- [ ] Firefox extension (WebExtension API is mostly compatible)
- [ ] Adapt MV3-specific code (service workers → background scripts for Firefox)
- [ ] Test fingerprint spoofing across browsers

**Acceptance criteria:**
- Firefox extension has feature parity with Chrome
- Same backend serves both browsers

### 4.4 Import/Export & Sharing (Priority: LOW)

**Tasks:**
- [ ] Export personas as JSON (share anonymized persona templates)
- [ ] Import persona templates from file or URL
- [ ] Community persona library (curated persona archetypes)

**Acceptance criteria:**
- Users can back up and restore their personas
- Community-shared personas work out of the box

---

## Phase 5 — Production & Scale (v1.0)
> **Goal**: Ready for real users. Secure, deployable, documented.

### 5.1 Docker & Deployment (Priority: CRITICAL)

**Tasks:**
- [ ] `Dockerfile` for backend (Python + uvicorn)
- [ ] `docker-compose.yml` — backend + PostgreSQL + (optional) Ollama
- [ ] Environment-based configuration (all settings via env vars)
- [ ] Health check endpoints (`/health`, `/ready`)
- [ ] Graceful shutdown handling

**Acceptance criteria:**
- `docker compose up` starts the full stack from zero
- Works on Linux, macOS, Windows (via Docker Desktop)

### 5.2 CI/CD Pipeline (Priority: HIGH)

**Tasks:**
- [ ] GitHub Actions workflow: lint → test → build → (optional) deploy
- [ ] Backend: `ruff` linting, `pytest` tests, `mypy` type checking
- [ ] Web portal: `eslint`, `tsc --noEmit`, build check
- [ ] Extension: `eslint`, manifest validation
- [ ] Automated release builds (tag → build → publish extension + Docker image)

**Acceptance criteria:**
- Every PR runs full test suite
- Main branch is always deployable
- Releases are automated

### 5.3 Security Audit & Hardening (Priority: HIGH)

**Tasks:**
- [ ] HTTPS enforcement (TLS termination via reverse proxy or built-in)
- [ ] Rate limiting on all API endpoints
- [ ] Input sanitization audit (prevent XSS, injection)
- [ ] CORS lockdown (only allow specific origins)
- [ ] API key rotation mechanism
- [ ] Secrets management (no plaintext API keys in config)
- [ ] CSP headers for web portal
- [ ] Extension permissions audit (minimize required permissions)

**Acceptance criteria:**
- Passes OWASP top 10 checklist
- No secrets in source code or logs
- Rate limiting prevents abuse

### 5.4 Documentation (Priority: MEDIUM)

**Tasks:**
- [ ] User guide: installation, configuration, usage
- [ ] API documentation (OpenAPI/Swagger, already partially auto-generated by FastAPI)
- [ ] Architecture documentation with diagrams
- [ ] Contributing guide
- [ ] Extension store listing copy and screenshots

**Acceptance criteria:**
- New user can install and configure without reading source code
- API is fully documented with examples
- Contributors can understand the codebase from docs alone

### 5.5 Performance Optimization (Priority: LOW)

**Tasks:**
- [ ] Backend: Connection pooling for database
- [ ] Backend: Cache LLM responses (same persona profile doesn't need re-generation)
- [ ] Backend: Async LLM calls (currently blocking via `asyncio.to_thread()`)
- [ ] Web portal: Add `React.memo`, `useMemo` for expensive renders
- [ ] Extension: Batch API calls instead of per-action polling

**Acceptance criteria:**
- Backend handles 100 concurrent users without degradation
- Web portal Lighthouse score > 90
- Extension adds < 50ms latency to page loads

---

## Release Timeline

| Phase | Version | Focus | Key Deliverable |
|-------|---------|-------|-----------------|
| Phase 1 | v0.2 | Foundation | Single integrated service, auth, tests, error handling |
| Phase 2 | v0.3 | Anti-Detection | Effective fingerprint spoofing, realistic behavioral noise |
| Phase 3 | v0.4 | UX | Analytics dashboard, real-time feed, settings UI, onboarding |
| Phase 4 | v0.5 | Intelligence | Adaptive personas, privacy scoring, multi-browser |
| Phase 5 | v1.0 | Production | Docker deployment, CI/CD, security audit, docs |

---

## Technical Debt to Address Throughout

These should be fixed opportunistically as you touch related code:

- [ ] Remove all `console.log` / `console.error` in favor of proper logging
- [ ] Add TypeScript strict mode to all web portal files (some use `any`)
- [ ] Add proper HTTP status codes to all API responses (some return 200 for errors)
- [ ] Replace magic numbers with named constants (e.g., `5` actions, `10` minute intervals)
- [ ] Add request/response type validation to extension API calls
- [ ] Add proper `Content-Security-Policy` to extension `manifest.json`

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Fingerprint uniqueness | < 1 in 10,000 (with Phantom) vs. 1 in 500,000 (without) | Panopticlick / AmIUnique |
| Noise plausibility | > 80% of phantom actions classified as "human" | Manual review + bot detection services |
| User setup time | < 5 minutes from install to first phantom action | User testing |
| System uptime | > 99.5% | Health check monitoring |
| Test coverage | > 70% backend, > 50% frontend | pytest + jest coverage reports |
