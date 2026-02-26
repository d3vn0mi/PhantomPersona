"""Scheduler for phantom noise generation tasks."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field

from .config import PhantomConfig
from .llm import BrowsingPlan, LLMEngine, Persona

log = logging.getLogger(__name__)


@dataclass
class NoiseEvent:
    timestamp: float
    event_type: str  # search | browse | shop | persona_rotate
    payload: dict
    delivered: bool = False


@dataclass
class NoiseQueue:
    """Holds generated noise waiting for the extension to consume."""

    events: list[NoiseEvent] = field(default_factory=list)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def push(self, event: NoiseEvent) -> None:
        async with self._lock:
            self.events.append(event)

    async def pop_batch(self, event_type: str | None = None, limit: int = 10) -> list[NoiseEvent]:
        async with self._lock:
            pending = [
                e for e in self.events
                if not e.delivered and (event_type is None or e.event_type == event_type)
            ][:limit]
            for e in pending:
                e.delivered = True
            return pending

    async def cleanup_delivered(self) -> int:
        async with self._lock:
            before = len(self.events)
            self.events = [e for e in self.events if not e.delivered]
            return before - len(self.events)


class PhantomScheduler:
    def __init__(self, config: PhantomConfig, llm: LLMEngine) -> None:
        self.config = config
        self.llm = llm
        self.queue = NoiseQueue()
        self._running = False
        self._tasks: list[asyncio.Task] = []
        self._last_persona_rotation = 0.0
        self.stats = {
            "searches_generated": 0,
            "pages_generated": 0,
            "products_generated": 0,
            "persona_rotations": 0,
        }

    async def start(self) -> None:
        self._running = True
        log.info("Phantom scheduler starting")
        self._tasks = [
            asyncio.create_task(self._search_loop()),
            asyncio.create_task(self._browsing_loop()),
            asyncio.create_task(self._persona_loop()),
            asyncio.create_task(self._cleanup_loop()),
        ]

    async def stop(self) -> None:
        self._running = False
        for task in self._tasks:
            task.cancel()
        log.info("Phantom scheduler stopped")

    def _should_rotate_persona(self) -> bool:
        hours = self.config.noise.persona_rotation_hours
        return (time.time() - self._last_persona_rotation) > hours * 3600

    async def _persona_loop(self) -> None:
        while self._running:
            try:
                if self._should_rotate_persona():
                    persona = await asyncio.to_thread(self.llm.generate_persona)
                    self._last_persona_rotation = time.time()
                    self.stats["persona_rotations"] += 1
                    await self.queue.push(NoiseEvent(
                        timestamp=time.time(),
                        event_type="persona_rotate",
                        payload={"persona": persona.summary()},
                    ))
            except Exception:
                log.exception("Persona rotation failed")
            await asyncio.sleep(60)  # Check every minute

    async def _search_loop(self) -> None:
        interval = self.config.scheduler.search_interval * 60
        count = self.config.noise.searches_per_cycle
        while self._running:
            try:
                queries = await asyncio.to_thread(
                    self.llm.generate_search_queries, count
                )
                for q in queries:
                    await self.queue.push(NoiseEvent(
                        timestamp=time.time(),
                        event_type="search",
                        payload={"query": q},
                    ))
                self.stats["searches_generated"] += len(queries)
                log.info("Generated %d search queries", len(queries))
            except Exception:
                log.exception("Search generation failed")
            await asyncio.sleep(interval)

    async def _browsing_loop(self) -> None:
        interval = self.config.scheduler.browsing_interval * 60
        num_pages = self.config.noise.pages_per_cycle
        num_products = self.config.noise.products_per_cycle
        while self._running:
            try:
                plan = await asyncio.to_thread(
                    self.llm.generate_browsing_plan, num_pages, num_products
                )
                for url in plan.urls_to_visit:
                    await self.queue.push(NoiseEvent(
                        timestamp=time.time(),
                        event_type="browse",
                        payload={"url": url},
                    ))
                for product in plan.products_to_browse:
                    await self.queue.push(NoiseEvent(
                        timestamp=time.time(),
                        event_type="shop",
                        payload={"product": product},
                    ))
                self.stats["pages_generated"] += len(plan.urls_to_visit)
                self.stats["products_generated"] += len(plan.products_to_browse)
                log.info(
                    "Generated browsing plan: %d pages, %d products",
                    len(plan.urls_to_visit),
                    len(plan.products_to_browse),
                )
            except Exception:
                log.exception("Browsing plan generation failed")
            await asyncio.sleep(interval)

    async def _cleanup_loop(self) -> None:
        while self._running:
            removed = await self.queue.cleanup_delivered()
            if removed:
                log.debug("Cleaned up %d delivered events", removed)
            await asyncio.sleep(300)
