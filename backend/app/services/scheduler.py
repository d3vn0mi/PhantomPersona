"""Background noise scheduler — merged from daemon/phantom_engine/scheduler.py.

Runs 4 async loops as FastAPI background tasks:
  - search loop: generates search queries via LLM
  - browsing loop: generates URLs + products via LLM
  - persona rotation loop: rotates persona periodically
  - cleanup loop: removes delivered noise events
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.db import async_session
from app.models.noise_event import NoiseEvent
from app.models.persona import Persona
from app.services.llm import generate_json

logger = logging.getLogger(__name__)

# --- LLM prompts for noise generation ---

SEARCH_PROMPT = """\
You are generating realistic search queries for a privacy noise tool.
The queries should look like natural Google searches — include occasional typos, \
abbreviations, and casual phrasing.

Current persona: {persona_summary}

Generate {count} diverse search queries this person would realistically make.
Return ONLY a JSON array of strings, no explanation:
["query 1", "query 2", ...]
"""

BROWSING_PROMPT = """\
You are generating a realistic browsing plan for a privacy noise tool.
Generate real, plausible URLs and specific products.

Current persona: {persona_summary}

Generate {num_pages} website URLs and {num_products} specific products (with site like Amazon, eBay, etc).
Return ONLY a JSON object:
{{
  "urls_to_visit": ["https://...", ...],
  "products_to_browse": ["product description on site", ...]
}}
"""

FORM_DATA_PROMPT = """\
Generate plausible fake form data for a fictional person.
Current persona: {persona_summary}

Return ONLY a JSON object with these fields:
{{
  "first_name": "...",
  "last_name": "...",
  "email": "...@...",
  "phone": "555-...",
  "address": "...",
  "city": "...",
  "state": "...",
  "zip": "...",
  "company": "...",
  "job_title": "..."
}}
"""


class PhantomScheduler:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._running = False
        self._tasks: list[asyncio.Task] = []
        self._current_persona_summary: str | None = None
        self.stats = {
            "searches_generated": 0,
            "pages_generated": 0,
            "products_generated": 0,
            "persona_rotations": 0,
        }

    @property
    def running(self) -> bool:
        return self._running

    @property
    def current_persona(self) -> str | None:
        return self._current_persona_summary

    async def start(self) -> None:
        if not self.settings.scheduler.enabled:
            logger.info("Scheduler disabled via config")
            return
        self._running = True
        self._tasks = [
            asyncio.create_task(self._search_loop()),
            asyncio.create_task(self._browsing_loop()),
            asyncio.create_task(self._persona_loop()),
            asyncio.create_task(self._cleanup_loop()),
        ]
        logger.info("Phantom scheduler started with %d loops", len(self._tasks))

    async def stop(self) -> None:
        self._running = False
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()
        logger.info("Phantom scheduler stopped")

    async def get_queue_depth(self) -> int:
        async with async_session() as db:
            result = await db.execute(
                select(func.count(NoiseEvent.id)).where(NoiseEvent.delivered == False)
            )
            return result.scalar() or 0

    def _in_active_hours(self) -> bool:
        hour = datetime.now(timezone.utc).hour
        start = self.settings.scheduler.active_hours_start
        end = self.settings.scheduler.active_hours_end
        if start <= end:
            return start <= hour < end
        return hour >= start or hour < end  # handles overnight ranges

    async def _get_active_persona_summary(self, db: AsyncSession) -> str | None:
        """Get a summary of an active persona for LLM prompts."""
        result = await db.execute(
            select(Persona).where(Persona.is_active == True).limit(1)
        )
        persona = result.scalar_one_or_none()
        if not persona:
            return None
        profile = json.loads(persona.profile) if persona.profile else {}
        return (
            f"{profile.get('name', persona.name)}, "
            f"age {profile.get('age', '?')}, "
            f"{profile.get('profession', '?')} from {profile.get('location', '?')}. "
            f"Interests: {', '.join(profile.get('interests', [])[:5])}"
        )

    async def _search_loop(self) -> None:
        cfg = self.settings
        interval = cfg.scheduler.search_interval * 60
        while self._running:
            try:
                if not self._in_active_hours():
                    await asyncio.sleep(60)
                    continue
                async with async_session() as db:
                    summary = await self._get_active_persona_summary(db)
                    if not summary:
                        await asyncio.sleep(60)
                        continue
                    self._current_persona_summary = summary
                    prompt = SEARCH_PROMPT.format(
                        persona_summary=summary,
                        count=cfg.noise.searches_per_cycle,
                    )
                    queries = await generate_json(prompt)
                    if isinstance(queries, list):
                        for q in queries:
                            event = NoiseEvent(
                                event_type="search",
                                payload=json.dumps({"query": q}),
                            )
                            db.add(event)
                            self.stats["searches_generated"] += 1
                        await db.commit()
                        logger.info("Generated %d search queries", len(queries))
            except Exception:
                logger.exception("Error in search loop")
            await asyncio.sleep(interval)

    async def _browsing_loop(self) -> None:
        cfg = self.settings
        interval = cfg.scheduler.browsing_interval * 60
        while self._running:
            try:
                if not self._in_active_hours():
                    await asyncio.sleep(60)
                    continue
                async with async_session() as db:
                    summary = await self._get_active_persona_summary(db)
                    if not summary:
                        await asyncio.sleep(60)
                        continue
                    prompt = BROWSING_PROMPT.format(
                        persona_summary=summary,
                        num_pages=cfg.noise.pages_per_cycle,
                        num_products=cfg.noise.products_per_cycle,
                    )
                    data = await generate_json(prompt)
                    for url in data.get("urls_to_visit", []):
                        event = NoiseEvent(
                            event_type="browse",
                            payload=json.dumps({"url": url}),
                        )
                        db.add(event)
                        self.stats["pages_generated"] += 1
                    for product in data.get("products_to_browse", []):
                        event = NoiseEvent(
                            event_type="shop",
                            payload=json.dumps({"product": product}),
                        )
                        db.add(event)
                        self.stats["products_generated"] += 1
                    await db.commit()
                    logger.info(
                        "Generated %d browse + %d shop events",
                        len(data.get("urls_to_visit", [])),
                        len(data.get("products_to_browse", [])),
                    )
            except Exception:
                logger.exception("Error in browsing loop")
            await asyncio.sleep(interval)

    async def _persona_loop(self) -> None:
        rotation_seconds = self.settings.noise.persona_rotation_hours * 3600
        while self._running:
            try:
                async with async_session() as db:
                    summary = await self._get_active_persona_summary(db)
                    if summary:
                        self._current_persona_summary = summary
                        self.stats["persona_rotations"] += 1
                        event = NoiseEvent(
                            event_type="persona_rotate",
                            payload=json.dumps({"persona": summary}),
                        )
                        db.add(event)
                        await db.commit()
                        logger.info("Persona rotation: %s", summary[:60])
            except Exception:
                logger.exception("Error in persona loop")
            await asyncio.sleep(rotation_seconds)

    async def _cleanup_loop(self) -> None:
        while self._running:
            try:
                async with async_session() as db:
                    result = await db.execute(
                        delete(NoiseEvent).where(NoiseEvent.delivered == True)
                    )
                    count = result.rowcount
                    await db.commit()
                    if count:
                        logger.info("Cleaned up %d delivered noise events", count)
            except Exception:
                logger.exception("Error in cleanup loop")
            await asyncio.sleep(300)


async def generate_form_data(persona_summary: str) -> dict:
    """Generate fake form data for the current persona."""
    prompt = FORM_DATA_PROMPT.format(persona_summary=persona_summary)
    return await generate_json(prompt)
