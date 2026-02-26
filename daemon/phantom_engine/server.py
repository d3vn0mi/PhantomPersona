"""API server — bridge between daemon and browser extension."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import PhantomConfig
from .llm import LLMEngine
from .scheduler import PhantomScheduler


class StatusResponse(BaseModel):
    running: bool
    current_persona: str | None
    stats: dict
    queue_depth: int


class NoiseEventResponse(BaseModel):
    event_type: str
    payload: dict


class FingerprintResponse(BaseModel):
    canvas_noise_seed: int
    webgl_noise_seed: int
    screen_width: int
    screen_height: int
    timezone: str
    language: str
    platform: str


# Plausible value pools for fingerprint randomization
_SCREEN_SIZES = [
    (1366, 768), (1920, 1080), (1536, 864), (1440, 900),
    (1280, 720), (1600, 900), (2560, 1440), (1280, 800),
]
_TIMEZONES = [
    "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
]
_LANGUAGES = ["en-US", "en-GB", "en", "es-US", "fr-CA"]
_PLATFORMS = ["Win32", "MacIntel", "Linux x86_64"]


def create_app(config: PhantomConfig) -> FastAPI:
    llm = LLMEngine(config.llm)
    scheduler = PhantomScheduler(config, llm)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await scheduler.start()
        yield
        await scheduler.stop()

    app = FastAPI(title="Phantom Daemon", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["chrome-extension://*", "moz-extension://*", "http://localhost:*"],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.get("/status", response_model=StatusResponse)
    async def get_status():
        persona = llm.persona
        return StatusResponse(
            running=scheduler._running,
            current_persona=persona.summary() if persona else None,
            stats=scheduler.stats,
            queue_depth=len([e for e in scheduler.queue.events if not e.delivered]),
        )

    @app.get("/noise/{event_type}", response_model=list[NoiseEventResponse])
    async def get_noise(event_type: str, limit: int = 10):
        events = await scheduler.queue.pop_batch(event_type, limit)
        return [
            NoiseEventResponse(event_type=e.event_type, payload=e.payload)
            for e in events
        ]

    @app.get("/noise", response_model=list[NoiseEventResponse])
    async def get_all_noise(limit: int = 20):
        events = await scheduler.queue.pop_batch(None, limit)
        return [
            NoiseEventResponse(event_type=e.event_type, payload=e.payload)
            for e in events
        ]

    @app.get("/fingerprint", response_model=FingerprintResponse)
    async def get_fingerprint():
        import hashlib
        import time
        # Deterministic-ish but rotating seed
        interval = config.fingerprint.rotation_interval * 60
        time_bucket = int(time.time() / interval)
        seed = int(hashlib.sha256(str(time_bucket).encode()).hexdigest()[:8], 16)
        rng_idx = seed  # Simple index into pools

        w, h = _SCREEN_SIZES[rng_idx % len(_SCREEN_SIZES)]
        return FingerprintResponse(
            canvas_noise_seed=seed,
            webgl_noise_seed=seed ^ 0xDEADBEEF,
            screen_width=w,
            screen_height=h,
            timezone=_TIMEZONES[rng_idx % len(_TIMEZONES)],
            language=_LANGUAGES[rng_idx % len(_LANGUAGES)],
            platform=_PLATFORMS[rng_idx % len(_PLATFORMS)],
        )

    @app.post("/persona/rotate")
    async def rotate_persona():
        persona = llm.generate_persona()
        return {"persona": persona.summary()}

    @app.get("/form-data")
    async def get_form_data():
        return llm.generate_form_data()

    return app
