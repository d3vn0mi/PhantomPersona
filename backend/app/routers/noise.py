"""Noise, fingerprint, and scheduler status endpoints — ported from daemon."""

from __future__ import annotations

import json
import time

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select, update

from app.config import get_settings
from app.db import async_session
from app.models.noise_event import NoiseEvent
from app.schemas.noise import FingerprintResponse, NoiseEventOut, StatusResponse
from app.services.scheduler import generate_form_data

router = APIRouter(prefix="/api", tags=["noise"])

# Plausible values for fingerprint rotation (ported from daemon)
_SCREENS = [
    (1366, 768), (1920, 1080), (1536, 864), (1440, 900),
    (1280, 720), (1600, 900), (2560, 1440), (1280, 800),
]
_TIMEZONES = [
    "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
]
_LANGUAGES = ["en-US", "en-GB", "en", "es-US", "fr-CA"]
_PLATFORMS = ["Win32", "MacIntel", "Linux x86_64"]


@router.get("/status", response_model=StatusResponse)
async def get_status(request: Request):
    scheduler = getattr(request.app.state, "scheduler", None)
    queue_depth = await scheduler.get_queue_depth() if scheduler else 0
    return StatusResponse(
        running=scheduler.running if scheduler else False,
        current_persona=scheduler.current_persona if scheduler else None,
        stats=scheduler.stats if scheduler else {},
        queue_depth=queue_depth,
    )


@router.get("/noise/{event_type}", response_model=list[NoiseEventOut])
async def get_noise_by_type(event_type: str, limit: int = Query(10, le=100)):
    """Fetch pending noise events of a specific type. Marks them as delivered."""
    async with async_session() as db:
        result = await db.execute(
            select(NoiseEvent)
            .where(NoiseEvent.event_type == event_type, NoiseEvent.delivered == False)
            .order_by(NoiseEvent.created_at)
            .limit(limit)
        )
        events = result.scalars().all()
        if events:
            ids = [e.id for e in events]
            await db.execute(
                update(NoiseEvent).where(NoiseEvent.id.in_(ids)).values(delivered=True)
            )
            await db.commit()
        return [
            NoiseEventOut(event_type=e.event_type, payload=json.loads(e.payload))
            for e in events
        ]


@router.get("/noise", response_model=list[NoiseEventOut])
async def get_all_noise(limit: int = Query(20, le=100)):
    """Fetch all pending noise events. Marks them as delivered."""
    async with async_session() as db:
        result = await db.execute(
            select(NoiseEvent)
            .where(NoiseEvent.delivered == False)
            .order_by(NoiseEvent.created_at)
            .limit(limit)
        )
        events = result.scalars().all()
        if events:
            ids = [e.id for e in events]
            await db.execute(
                update(NoiseEvent).where(NoiseEvent.id.in_(ids)).values(delivered=True)
            )
            await db.commit()
        return [
            NoiseEventOut(event_type=e.event_type, payload=json.loads(e.payload))
            for e in events
        ]


@router.get("/fingerprint", response_model=FingerprintResponse)
async def get_fingerprint():
    """Deterministic fingerprint config that rotates on a schedule."""
    settings = get_settings()
    rotation = settings.fingerprint.rotation_interval * 60
    bucket = int(time.time()) // rotation

    canvas_seed = bucket * 2654435761 & 0xFFFFFFFF
    webgl_seed = canvas_seed ^ 0xDEADBEEF

    screen = _SCREENS[bucket % len(_SCREENS)]
    tz = _TIMEZONES[bucket % len(_TIMEZONES)]
    lang = _LANGUAGES[bucket % len(_LANGUAGES)]
    platform = _PLATFORMS[bucket % len(_PLATFORMS)]

    return FingerprintResponse(
        canvas_noise_seed=canvas_seed,
        webgl_noise_seed=webgl_seed,
        screen_width=screen[0],
        screen_height=screen[1],
        timezone=tz,
        language=lang,
        platform=platform,
    )


@router.post("/persona/rotate")
async def rotate_persona(request: Request):
    """Force a persona rotation."""
    scheduler = request.app.state.scheduler
    if not scheduler or not scheduler.current_persona:
        raise HTTPException(400, "No active persona to rotate")
    return {"persona": scheduler.current_persona}


@router.get("/form-data")
async def get_form_data(request: Request):
    """Generate fake form data matching the current persona."""
    scheduler = request.app.state.scheduler
    if not scheduler or not scheduler.current_persona:
        raise HTTPException(400, "No active persona — cannot generate form data")
    return await generate_form_data(scheduler.current_persona)
